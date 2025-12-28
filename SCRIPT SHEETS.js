/**
 * КОНФИГУРАЦИЯ
 */
const TELEGRAM_TOKEN = '8584425867:AAFbjHHrSLYx6hdiXnNaaBx2dR7cD9NG2jw';
const B24_WEBHOOK_URL = "https://drave5inb2.temp.swtest.ru/rest/1/zt6j93x9rzn0jhtc/";
const B24_BASE_URL = "https://drave5inb2.temp.swtest.ru";

// STATUS DROPDOWN OPTIONS
const STATUS_OPTS_ADMIN = ['В обработке', 'КП отправлено', 'Готов купить', 'Ожидает оплаты', 'В пути', 'Выполнен', 'Аннулирован', 'Отказ'];
const STATUS_OPTS_CLIENT = ['В обработке', 'КП готово', 'Подтверждение от поставщика', 'Отказ', 'Аннулирован', 'Выполнен'];
const STATUS_OPTS_SUPPLIER = ['Сбор предложений', 'Идут торги', 'Выиграл', 'Проиграл', 'Частично выиграл', 'Торги завершены'];

// ЭТАЛОННЫЕ ЗАГОЛОВКИ
const MARKET_DATA_HEADERS = [
  'ID', 'Parent ID', 'Тип', 'Статус', 'VIN', 'Имя', 'Телефон', 'Сводка', 'JSON', 'Детали/Цены', 'Дата', 'Локация', 'СТАТУС ПОСТАВЩИК', 'СТАТУС КЛИЕНТ', 'СТАТУС АДМИН'
];

/**
 * ПОЛУЧЕНИЕ КАРТЫ КОЛОНОК
 */
function getColumnHeaders(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i + 1);
  return colMap;
}

/**
 * LOGGING HELPER
 */
function logAction(doc, message, type = 'INFO', payload = null) {
  try {
    let sheet = doc.getSheetByName('ActionLogs');
    if (!sheet) {
      sheet = doc.insertSheet('ActionLogs');
      sheet.appendRow(['Timestamp', 'Type', 'Message', 'Payload']);
      sheet.setColumnWidth(1, 150);
      sheet.setColumnWidth(3, 300);
      sheet.setColumnWidth(4, 300);
    }
    const timestamp = new Date();
    const payloadStr = payload ? JSON.stringify(payload).substring(0, 2000) : ''; 
    sheet.insertRowAfter(1);
    sheet.getRange(2, 1, 1, 4).setValues([[timestamp, type, message, payloadStr]]);
  } catch(e) {
    console.error("Logging failed", e);
  }
}

/**
 * ТОЧКА ВХОДА GET
 */
function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getData') {
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = doc.getSheetByName('MarketData');
    if (!sheet) return response([]);
    
    const colMap = getColumnHeaders(sheet);
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);
    const idx = (name) => colMap[name] ? colMap[name] - 1 : -999;
    
    return response(rows.map(r => ({
      id: r[idx('ID')], 
      parentId: r[idx('Parent ID')], 
      type: r[idx('Тип')], 
      status: r[idx('Статус')], 
      vin: r[idx('VIN')], 
      clientName: r[idx('Имя')], 
      clientPhone: r[idx('Телефон')] || '', 
      summary: r[idx('Сводка')], 
      json: r[idx('JSON')], 
      rank: r[idx('Детали/Цены')], 
      createdAt: r[idx('Дата')], 
      location: r[idx('Локация')], 
      statusSupplier: r[idx('СТАТУС ПОСТАВЩИК')] || '',
      statusClient: r[idx('СТАТУС КЛИЕНТ')] || '',
      statusAdmin: r[idx('СТАТУС АДМИН')] || ''
    })));
  }
  return response({status: "alive", version: "7.0.0-fixed-rank-update"});
}

/**
 * ТОЧКА ВХОДА POST
 */
function doPost(e) {
  if (!e || !e.postData) return response({error: "No post data"});
  
  const lock = LockService.getScriptLock();
  try {
      lock.waitLock(30000); 
  } catch (e) {
      return response({error: "Server busy, try again"});
  }
  
  try {
    const contents = JSON.parse(e.postData.contents);
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    
    logAction(doc, `Incoming Action: ${contents.action}`, 'REQUEST', contents);

    if (contents.message || contents.callback_query) {
      const subSheet = getOrCreateSheet(doc, 'Subscribers', ['ChatID', 'Username', 'Date']);
      handleTelegramUpdate(contents, subSheet);
      return response({status: 'telegram_ok'});
    }

    const sheet = getOrCreateSheet(doc, 'MarketData', MARKET_DATA_HEADERS);
    const colMap = getColumnHeaders(sheet); 
    const body = contents;

    if (body.action === 'create' && body.order.type === 'ORDER') {
      const o = body.order;
      o.id = String(getNextId(sheet));
      
      let b24Result = { id: null };
      try {
          b24Result = addLeadWithTg(o);
          if (b24Result && b24Result.id && o.items.length > 0) {
            o.items[0].bitrixId = b24Result.id;
          }
      } catch(e) { console.error("CRM Error", e); }

      const itemsJson = JSON.stringify(o.items);
      const summary = (o.items || []).map(i => `${i.name} (${i.quantity} шт)`).join(', ');
      const formattedDate = (o.createdAt || '').replace(', ', '\n');
      const readableStatus = generateOrderSummary(o.items);

      const rowData = new Array(sheet.getLastColumn()).fill('');
      const setVal = (colName, val) => { if (colMap[colName]) rowData[colMap[colName]-1] = val; };

      setVal('ID', o.id);
      setVal('Parent ID', '');
      setVal('Тип', 'ORDER');
      setVal('Статус', o.status);
      setVal('VIN', o.vin);
      setVal('Имя', o.clientName);
      setVal('Телефон', o.clientPhone || '');
      setVal('Сводка', summary);
      setVal('JSON', itemsJson);
      setVal('Детали/Цены', readableStatus);
      setVal('Дата', formattedDate);
      setVal('Локация', o.location);
      setVal('СТАТУС ПОСТАВЩИК', 'Сбор предложений');
      setVal('СТАТУС КЛИЕНТ', 'В обработке');
      setVal('СТАТУС АДМИН', 'В обработке');
      
      sheet.insertRowAfter(1);
      sheet.getRange(2, 1, 1, rowData.length).setValues([rowData]);
      
      try {
        const subSheet = doc.getSheetByName('Subscribers');
        broadcastMessage(formatNewOrderMessage(o, b24Result), subSheet);
      } catch(e) { console.error("TG Error", e); }

      return response({status: 'ok', orderId: o.id});
    } 
    else if (body.action === 'create' && body.order.type === 'OFFER') {
      const o = body.order;
      const offerNum = countOffersForOrder(sheet, o.parentId) + 1;
      o.id = `${o.parentId}-${offerNum}`;
      const itemsJson = JSON.stringify(o.items);
      
      const rowData = new Array(sheet.getLastColumn()).fill('');
      const setVal = (colName, val) => { if (colMap[colName]) rowData[colMap[colName]-1] = val; };

      setVal('ID', o.id);
      setVal('Parent ID', o.parentId);
      setVal('Тип', 'OFFER');
      setVal('Статус', o.status);
      setVal('VIN', o.vin);
      setVal('Имя', o.clientName);
      setVal('Телефон', o.sellerPhone || '');
      setVal('Сводка', 'Предложение');
      setVal('JSON', itemsJson);
      setVal('Детали/Цены', generateOfferSummary(o.items));
      setVal('Дата', (o.createdAt || '').replace(', ', '\n'));
      setVal('Локация', o.location);
      setVal('СТАТУС ПОСТАВЩИК', 'Идут торги');

      const insertionIndex = findBlockEndIndex(sheet, o.parentId);
      sheet.insertRowAfter(insertionIndex);
      sheet.getRange(insertionIndex + 1, 1, 1, rowData.length).setValues([rowData]);
      
      const orderRowIndex = findOrderRowIndexById(sheet, o.parentId);
      if (orderRowIndex > 0 && colMap['СТАТУС ПОСТАВЩИК']) {
        sheet.getRange(orderRowIndex, colMap['СТАТУС ПОСТАВЩИК']).setValue('Идут торги');
      }
      
      try {
        const subSheet = doc.getSheetByName('Subscribers');
        const parentRow = findOrderRowById(sheet, o.parentId);
        broadcastMessage(formatNewOfferMessage(o, offerNum, parentRow, sheet), subSheet);
      } catch(e) { console.error("TG Offer Error", e); }

      return response({status: 'ok'});
    }
    else if (body.action === 'form_cp') {
      const orderRowIndex = findOrderRowIndexById(sheet, body.orderId);
      if (orderRowIndex > 0) {
        if(colMap['СТАТУС КЛИЕНТ']) sheet.getRange(orderRowIndex, colMap['СТАТУС КЛИЕНТ']).setValue('КП готово');
        if(colMap['СТАТУС АДМИН']) sheet.getRange(orderRowIndex, colMap['СТАТУС АДМИН']).setValue('КП отправлено');
        
        updateSupplierStatuses(sheet, body.orderId);
      }
      try {
        const orderRow = findOrderRowById(sheet, body.orderId);
        broadcastMessage(orderRow ? formatCPMessage(body.orderId, orderRow, sheet) : "✅ КП Сформировано", doc.getSheetByName('Subscribers'));
      } catch(e){}
    }
    else if (body.action === 'confirm_purchase') {
      const orderRowIndex = findOrderRowIndexById(sheet, body.orderId);
      if (orderRowIndex > 0) {
        if(colMap['СТАТУС КЛИЕНТ']) sheet.getRange(orderRowIndex, colMap['СТАТУС КЛИЕНТ']).setValue('Подтверждение от поставщика');
        if(colMap['СТАТУС АДМИН']) sheet.getRange(orderRowIndex, colMap['СТАТУС АДМИН']).setValue('Готов купить');
      }
      try {
         broadcastMessage(formatPurchaseConfirmationMessage(body.orderId, findOrderRowById(sheet, body.orderId), sheet), doc.getSheetByName('Subscribers'));
      } catch(e){}
    }
    else if (body.action === 'refuse_order') {
       const idx = findOrderRowIndexById(sheet, body.orderId);
       if (idx > 0) {
         const status = body.source === 'ADMIN' ? 'Аннулирован' : 'Отказ';
         if(colMap['СТАТУС КЛИЕНТ']) sheet.getRange(idx, colMap['СТАТУС КЛИЕНТ']).setValue(status);
         if(colMap['СТАТУС АДМИН']) sheet.getRange(idx, colMap['СТАТУС АДМИН']).setValue(status);
         if(colMap['Статус']) sheet.getRange(idx, colMap['Статус']).setValue('ЗАКРЫТ');
         if (body.reason && colMap['JSON']) {
            try {
                let items = JSON.parse(sheet.getRange(idx, colMap['JSON']).getValue() || '[]');
                if (items.length > 0) { 
                    items[0].refusalReason = body.reason; 
                    sheet.getRange(idx, colMap['JSON']).setValue(JSON.stringify(items)); 
                }
            } catch(e){}
         }
       }
       try {
           const orderRow = findOrderRowById(sheet, body.orderId);
           if(orderRow) {
               const subSheet = doc.getSheetByName('Subscribers');
               const allOffers = getAllOffersForOrder(sheet, body.orderId);
               const message = body.source === 'ADMIN' 
                  ? formatAdminAnnulmentMessage(body.orderId, orderRow, body.reason, sheet) 
                  : formatRefusalMessage(body.orderId, orderRow, allOffers, sheet);
               broadcastMessage(message, subSheet);
           }
       } catch(e){}
    }
    else if (body.action === 'update_workflow_status') {
      const idx = findOrderRowIndexById(sheet, body.orderId);
      if (idx > 0 && body.status) {
        if(colMap['СТАТУС КЛИЕНТ']) sheet.getRange(idx, colMap['СТАТУС КЛИЕНТ']).setValue(body.status);
        if(colMap['СТАТУС АДМИН']) sheet.getRange(idx, colMap['СТАТУС АДМИН']).setValue(body.status);
      }
    }
    else if (body.action === 'update_json') {
       updateCellByColumnName(sheet, body.orderId, 'JSON', JSON.stringify(body.items));
       const summary = body.items.map(i => `${i.AdminName || i.name} (${i.quantity} шт)`).join(', ');
       updateCellByColumnName(sheet, body.orderId, 'Сводка', summary);
       propagateEditsToOffers(sheet, body.orderId, body.items);
       recalculateSummaryOrReceipt(sheet, body.orderId, body.items);
    }
    else if (body.action === 'update_rank') {
      handleRankUpdate(sheet, body, doc);
    }

    try {
        setupValidations(sheet);
        formatSheetStyles(sheet);
        formatRows(sheet); 
    } catch(e) {}
    
    return response({status: 'ok'});
  } catch (err) {
    logAction(SpreadsheetApp.getActiveSpreadsheet(), `Error: ${err.toString()}`, 'ERROR');
    return response({error: err.toString()});
  } finally {
    lock.releaseLock();
  }
}

function handleRankUpdate(sheet, body, doc) {
  const { detailName, leadOfferId, adminPrice, adminCurrency, adminComment, deliveryRate } = body;
  const colMap = getColumnHeaders(sheet);
  const data = sheet.getDataRange().getValues();
  
  const idIndex = colMap['ID'] - 1;
  const parentIdIndex = colMap['Parent ID'] - 1;
  const typeIndex = colMap['Тип'] - 1;
  const jsonIndex = colMap['JSON'] - 1;
  const detailsIndex = colMap['Детали/Цены']; // 1-based
  const jsonColNum = colMap['JSON']; // 1-based
  
  logAction(doc, `Rank Update Start for ${detailName}`, 'DEBUG', {leadOfferId});

  let parentId = null;
  // 1. Find Parent ID of the Offer
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]) === String(leadOfferId)) {
      parentId = data[i][parentIdIndex];
      break;
    }
  }
  
  if (!parentId) {
      logAction(doc, `Parent ID not found for Offer ${leadOfferId}`, 'ERROR');
      return;
  }

  const targetNameLower = detailName.trim().toLowerCase();
  const isReset = body.actionType === 'RESET'; 
  let updateCount = 0;

  // 2. Iterate ALL rows to find siblings (Offers of same Parent)
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][parentIdIndex]) === String(parentId) && data[i][typeIndex] === 'OFFER') {
        let items = [];
        try { items = JSON.parse(data[i][jsonIndex] || '[]'); } catch(e) {}
        
        let changed = false;
        items = items.map(item => {
            const n = item.AdminName || item.name;
            const match = n.trim().toLowerCase() === targetNameLower || item.name.trim().toLowerCase() === targetNameLower;
            
            if (match) {
                if (isReset) {
                    if (item.rank === 'ЛИДЕР' || item.rank === 'LEADER') {
                        item.rank = 'РЕЗЕРВ';
                        changed = true;
                    }
                } else {
                    if (String(data[i][idIndex]) === String(leadOfferId)) {
                        // This is the WINNER
                        if (item.rank !== 'ЛИДЕР') {
                            item.rank = 'ЛИДЕР';
                            // Update Admin Fields
                            if (adminPrice !== undefined) item.adminPrice = adminPrice;
                            if (adminCurrency !== undefined) item.adminCurrency = adminCurrency;
                            if (adminComment !== undefined) item.adminComment = adminComment;
                            if (deliveryRate !== undefined) item.deliveryRate = deliveryRate;
                            changed = true;
                        } else {
                            // Update Admin Fields even if already leader
                            let subChange = false;
                            if (adminPrice !== undefined && item.adminPrice !== adminPrice) { item.adminPrice = adminPrice; subChange = true; }
                            if (adminCurrency !== undefined && item.adminCurrency !== adminCurrency) { item.adminCurrency = adminCurrency; subChange = true; }
                            if (adminComment !== undefined && item.adminComment !== adminComment) { item.adminComment = adminComment; subChange = true; }
                            if (deliveryRate !== undefined && item.deliveryRate !== deliveryRate) { item.deliveryRate = deliveryRate; subChange = true; }
                            if (subChange) changed = true;
                        }
                    } else {
                        // This is a LOSER (for this item)
                        if (item.rank === 'ЛИДЕР' || item.rank === 'LEADER') {
                            item.rank = 'РЕЗЕРВ';
                            changed = true;
                        }
                    }
                }
            }
            return item;
        });

        if (changed) {
            sheet.getRange(i + 1, jsonColNum).setValue(JSON.stringify(items));
            sheet.getRange(i + 1, detailsIndex).setValue(generateOfferSummary(items));
            updateCount++;
        }
    }
  }
  
  logAction(doc, `Rank Update Finished. Updated ${updateCount} rows`, 'DEBUG');

  // 3. Update Order Summary (Receipt)
  updateOrderReceipt(sheet, parentId);
  
  // 4. Update Statuses immediately (Visual Feedback)
  updateSupplierStatuses(sheet, parentId);
}

function updateOrderReceipt(sheet, orderId) {
  const colMap = getColumnHeaders(sheet);
  const data = sheet.getDataRange().getValues();
  const idIndex = colMap['ID'] - 1;
  const parentIdIndex = colMap['Parent ID'] - 1;
  const typeIndex = colMap['Тип'] - 1;
  const jsonIndex = colMap['JSON'] - 1;
  const detailsIndex = colMap['Детали/Цены']; // 1-based

  const allLeaderItems = [];
  let carInfo = null;
  let orderRowIndex = -1;

  for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIndex]) === String(orderId)) {
          orderRowIndex = i;
          try { 
             const raw = JSON.parse(data[i][jsonIndex]);
             if (raw.length > 0) carInfo = raw[0].car;
          } catch(e) {}
      }
      if (String(data[i][parentIdIndex]) === String(orderId) && data[i][typeIndex] === 'OFFER') {
         let oItems = [];
         try { oItems = JSON.parse(data[i][jsonIndex] || '[]'); } catch(e){}
         oItems.forEach(item => {
             if (item.rank === 'ЛИДЕР' || item.rank === 'LEADER') allLeaderItems.push(item);
         });
      }
   }
   
   if (orderRowIndex !== -1) {
       if (carInfo && carInfo.AdminModel) carInfo.model = carInfo.AdminModel; 
       if (carInfo && carInfo.AdminYear) carInfo.year = carInfo.AdminYear;
       
       if (allLeaderItems.length > 0) {
           sheet.getRange(orderRowIndex + 1, detailsIndex).setValue(generateFinalOrderReceipt(carInfo, allLeaderItems));
       } else {
           // Revert to default summary if no leaders
           try {
               const raw = JSON.parse(data[orderRowIndex][jsonIndex]);
               sheet.getRange(orderRowIndex + 1, detailsIndex).setValue(generateOrderSummary(raw));
           } catch(e){}
       }
   }
}

function updateSupplierStatuses(sheet, orderId) {
    const colMap = getColumnHeaders(sheet);
    const data = sheet.getDataRange().getValues();
    const parentIdIndex = colMap['Parent ID'] - 1;
    const typeIndex = colMap['Тип'] - 1;
    const jsonIndex = colMap['JSON'] - 1;
    const supplierStatusCol = colMap['СТАТУС ПОСТАВЩИК']; // 1-based

    if (!supplierStatusCol) return;

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][parentIdIndex]) === String(orderId) && data[i][typeIndex] === 'OFFER') {
            try {
                const items = JSON.parse(data[i][jsonIndex] || '[]');
                const totalItems = items.filter(it => (it.offeredQuantity || 0) > 0).length; // Only count valid offers
                const leaderCount = items.filter(item => item.rank === 'ЛИДЕР' || item.rank === 'LEADER').length;
                
                let offerStatus = 'Идут торги'; // Default
                if (totalItems > 0) {
                    if (leaderCount === totalItems) offerStatus = 'Выиграл';
                    else if (leaderCount > 0) offerStatus = 'Частично выиграл';
                    else offerStatus = 'Проиграл';
                }
                
                // If the overall order status is not processed yet, maybe keep "Идут торги"?
                // But user wants immediate feedback.
                
                sheet.getRange(i + 1, supplierStatusCol).setValue(offerStatus);
            } catch(e) {}
        }
    }
}

function getOrCreateSheet(doc, name, headers) {
  let s = doc.getSheetByName(name);
  if (!s) { 
    s = doc.insertSheet(name); 
    s.appendRow(headers); 
    s.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e5e7eb"); 
    s.setFrozenRows(1); 
  } else {
    const currentHeaders = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
    if (currentHeaders.indexOf('Телефон') === -1 && name === 'MarketData') {
       const nameIdx = currentHeaders.indexOf('Имя');
       if (nameIdx !== -1) {
         s.insertColumnAfter(nameIdx + 1);
         s.getRange(1, nameIdx + 2).setValue('Телефон').setFontWeight("bold").setBackground("#e5e7eb");
       }
    }
  }
  return s;
}

// FIXED: Uses colMap to find ID column index
function findOrderRowIndexById(sheet, id) {
  const colMap = getColumnHeaders(sheet);
  const idIndex = colMap['ID'] - 1;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) { if (String(data[i][idIndex]) === String(id)) return i + 1; }
  return -1;
}

// FIXED: Uses colMap to find ID column index
function findOrderRowById(sheet, id) {
  const colMap = getColumnHeaders(sheet);
  const idIndex = colMap['ID'] - 1;
  const data = sheet.getDataRange().getValues();
  for (let i =1; i < data.length; i++) { if (String(data[i][idIndex]) === String(id)) return data[i]; }
  return null;
}

function getNextId(sheet) {
  const colMap = getColumnHeaders(sheet);
  const idIndex = colMap['ID'] - 1;
  const data = sheet.getDataRange().getValues();
  let max = 0;
  for (let i = 1; i < data.length; i++) {
    const val = data[i][idIndex];
    if (val && !isNaN(val)) {
      const num = Number(val);
      if (num < 1000000 && num > max) max = num;
    }
  }
  return max + 1;
}

function updateCellByColumnName(sheet, id, columnName, value) {
  const colMap = getColumnHeaders(sheet);
  const colIndex = colMap[columnName];
  if (!colIndex) return;
  const idx = findOrderRowIndexById(sheet, id);
  if (idx > 0) sheet.getRange(idx, colIndex).setValue(value);
}

function setupValidations(sheet) {
  const colMap = getColumnHeaders(sheet);
  const lastRow = Math.max(sheet.getLastRow(), 2);
  const setRule = (colName, options) => {
    const colIndex = colMap[colName];
    if (!colIndex) return;
    const range = sheet.getRange(2, colIndex, lastRow - 1, 1);
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(options).setAllowInvalid(true).build();
    range.setDataValidation(rule);
  };
  setRule('СТАТУС АДМИН', STATUS_OPTS_ADMIN);
  setRule('СТАТУС КЛИЕНТ', STATUS_OPTS_CLIENT);
  setRule('СТАТУС ПОСТАВЩИК', STATUS_OPTS_SUPPLIER);
}

function generateOrderSummary(items) {
    let car = items[0]?.car;
    let header = getCarHeader(car);
    const lines = items.map(i => `⬜ | ${i.AdminName || i.name} | ${i.quantity} шт`);
    return `${header}\n${lines.join('\n')}`;
}

function getCarHeader(car) {
    if (!car) return "Авто не указано";
    return [car.brand, car.AdminModel || car.model, car.AdminYear || car.year].filter(Boolean).join(' | ');
}

function getExtendedCarTitle(car, clientName) {
    if (!car) return clientName;
    const brand = car.brand || "";
    const model = car.AdminModel || car.model || "";
    const year = car.AdminYear || car.year || "";
    const parts = [brand, model, year, clientName].filter(Boolean);
    return parts.join(' | ');
}

function generateOfferSummary(items) {
    return items.map(i => `${(i.rank === 'ЛИДЕР' || i.rank === 'LEADER') ? '✅' : '⬜'} | ${i.name} | ${i.quantity} шт`).join('\n');
}

// FIXED: Uses colMap to find ID and ParentID indices
function findBlockEndIndex(sheet, parentId) {
  const colMap = getColumnHeaders(sheet);
  const idIndex = colMap['ID'] - 1;
  const parentIdIndex = colMap['Parent ID'] - 1;
  
  const data = sheet.getDataRange().getValues();
  let lastIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]) === String(parentId) || String(data[i][parentIdIndex]) === String(parentId)) lastIndex = i + 1;
    else if (lastIndex !== -1) break; 
  }
  return lastIndex === -1 ? sheet.getLastRow() : lastIndex;
}

function formatSheetStyles(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const colMap = getColumnHeaders(sheet);
  if (colMap['JSON']) {
    sheet.setColumnWidth(colMap['JSON'], 100);
    sheet.getRange(2, colMap['JSON'], lastRow-1, 1).setWrap(false);
  }
  if (colMap['Детали/Цены']) {
    sheet.setColumnWidth(colMap['Детали/Цены'], 300);
    sheet.getRange(2, colMap['Детали/Цены'], lastRow-1, 1).setWrap(true);
  }
}

function formatRows(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;
  const colMap = getColumnHeaders(sheet);
  const typeIdx = colMap['Тип']-1;
  const sSupIdx = colMap['СТАТУС ПОСТАВЩИК']-1;
  const sCliIdx = colMap['СТАТУС КЛИЕНТ']-1;
  const sAdmIdx = colMap['СТАТУС АДМИН']-1;

  for (let i = 1; i < data.length; i++) {
    const type = data[i][typeIdx];
    const sS = sSupIdx >= 0 ? (data[i][sSupIdx] || '').toLowerCase() : '';
    const sC = sCliIdx >= 0 ? (data[i][sCliIdx] || '').toLowerCase() : '';
    const range = sheet.getRange(i+1, 1, 1, sheet.getLastColumn());

    if (sC.includes('аннулирован') || sC.includes('отказ')) range.setBackground('#ffebee').setFontColor('#b71c1c');
    else if (sC.includes('готов купить') || sS.includes('выиграл')) range.setBackground('#e8f5e9');
    else if (type === 'OFFER') range.setBackground('#fffde7');
    else range.setBackground(null).setFontColor(null);
  }
}

function handleTelegramUpdate(contents, subSheet) {
  const msg = contents.message;
  if (msg && msg.text === '/start') {
    const chatId = String(msg.chat.id);
    const data = subSheet.getDataRange().getValues();
    if (!data.some(r => String(r[0]) === chatId)) subSheet.appendRow([chatId, msg.from.username || 'User', new Date()]);
  }
}

function broadcastMessage(html, subSheet) {
  if (!subSheet) return;
  const data = subSheet.getDataRange().getValues();
  data.slice(1).forEach(r => {
    if (r[0]) UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ chat_id: String(r[0]), text: html, parse_mode: 'HTML', disable_web_page_preview: true }),
      muteHttpExceptions: true
    });
  });
}

function response(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

// --- FORMATTERS (Moved from SCRIPT SHEETS.js and adapted) ---

function formatNewOfferMessage(offer, offerNum, parentRow, sheet) {
    const colMap = getColumnHeaders(sheet);
    let carStr = "Авто не найдено";
    let clientName = "Неизвестно";
    let vin = offer.vin;
    let bitrixId = null;
    let itemsHtml = "";
    let leadTitle = "CRM Lead";
    let totalSum = 0;
    let currency = 'RUB';
    
    if (parentRow) {
        try {
            const nameIdx = colMap['Имя'] - 1;
            const jsonIdx = colMap['JSON'] - 1;
            clientName = parentRow[nameIdx];
            const json = JSON.parse(parentRow[jsonIdx]);
            const car = json[0]?.car;
            bitrixId = json[0]?.bitrixId;
            carStr = getCarHeader(car);
            leadTitle = getExtendedCarTitle(car, clientName);
        } catch(e) {}
    }

    if (offer.items) {
        offer.items.forEach(item => {
            if ((item.offeredQuantity || 0) > 0) {
                const price = item.sellerPrice || 0;
                const cur = item.sellerCurrency === 'USD' ? '$' : (item.sellerCurrency === 'CNY' ? '¥' : '₽');
                currency = item.sellerCurrency || 'RUB'; 
                const qty = item.offeredQuantity || 1;
                itemsHtml += `• ${item.name} — <b>${price}${cur}</b> x <b>${qty}шт</b>\n`;
                totalSum += price * qty;
            }
        });
    }

    const curSymbol = currency === 'USD' ? '$' : (currency === 'CNY' ? '¥' : '₽');

    let msg = `💰 <b>НОВОЕ ПРЕДЛОЖЕНИЕ (№${offerNum})</b>\n`;
    msg += `К заказу: <code>${offer.parentId}</code>\n`;
    msg += `Поставщик: <b>${offer.clientName}</b>\n\n`;
    
    msg += `🚘 <b>Машина:</b> ${carStr}\n`;
    msg += `👤 <b>Клиент:</b> ${clientName}\n`;
    msg += `🔢 <b>VIN:</b> <code>${vin}</code>\n\n`;
    
    if (itemsHtml) {
        msg += `📋 <b>ПОЗИЦИИ:</b>\n${itemsHtml}\n`;
        msg += `💰 <b>ИТОГО: ${totalSum.toLocaleString()} ${curSymbol}</b>\n`;
    }

    if (bitrixId) {
      msg += `\n🔗 <a href="${B24_BASE_URL}/crm/lead/details/${bitrixId}/">${leadTitle}</a>`;
    }
    
    return msg;
}

function formatNewOrderMessage(order, b24Result) {
  const car = order.items && order.items.length > 0 ? order.items[0].car : null;
  const carStr = getCarHeader(car);
  let leadTitle = getExtendedCarTitle(car, order.clientName);
  
  let msg = `🔥 <b>НОВЫЙ ЗАКАЗ</b>\n`;
  msg += `ID: <code>${order.id}</code>\n`;
  msg += `Клиент: <b>${order.clientName}</b>\n`;
  msg += `VIN: <code>${order.vin}</code>\n\n`;
  
  msg += `🚘 <b>Машина:</b> ${carStr}\n\n`;
  
  msg += `📋 <b>ПОЗИЦИИ:</b>\n`;
  if (order.items) {
    order.items.forEach(i => msg += `• ${i.name} — ${i.quantity} шт\n`);
  }
  msg += `\n`;
  
  if (b24Result && b24Result.id) {
    msg += `🔗 <a href="${B24_BASE_URL}/crm/lead/details/${b24Result.id}/">${leadTitle}</a>`;
  } else if (b24Result && b24Result.error) {
    msg += `⚠️ <b>ОШИБКА CRM:</b> <i>${b24Result.error}</i>`;
  } else {
    msg += `⚠️ <i>Лид в CRM не создан</i>`;
  }
  return msg;
}

function addLeadWithTg(order) {
  var carModel = "Авто не указано";
  if (order.items && order.items.length > 0 && order.items[0].car) { 
    carModel = order.items[0].car.model || "Модель?"; 
  }
  var leadTitleText = carModel + " | " + (order.clientName || "Клиент");
  var rawTitle = leadTitleText + " | " + (order.vin || "Без VIN");
  var leadTitleEnc = encodeURIComponent(rawTitle);
  var clientName = encodeURIComponent(order.clientName || "Неизвестный");
  var comments = encodeURIComponent("Заказ: " + order.id + "\nVIN: " + (order.vin || "-") + "\nЛокация: " + (order.location || "-"));

  var options = { "method": "get", "validateHttpsCertificates": false, "muteHttpExceptions": true };
  try {
    var leadUrl = B24_WEBHOOK_URL + "crm.lead.add?fields[TITLE]=" + leadTitleEnc + "&fields[NAME]=" + clientName + "&fields[COMMENTS]=" + comments + "&fields[STATUS_ID]=NEW&fields[OPENED]=Y"; 
    var leadResponse = UrlFetchApp.fetch(leadUrl, options); 
    var leadJson = JSON.parse(leadResponse.getContentText());
    if (!leadJson.result) return { error: leadJson.error_description || "Ошибка Б24" };
    var newLeadId = leadJson.result;

    if (order.items && order.items.length > 0) {
      var productParams = "?id=" + newLeadId;
      for (var i = 0; i < order.items.length; i++) {
        var item = order.items[i];
        productParams += "&rows[" + i + "][PRODUCT_NAME]=" + encodeURIComponent(item.name) + "&rows[" + i + "][PRICE]=0&rows[" + i + "][QUANTITY]=" + (item.quantity || 1) + "&rows[" + i + "][CURRENCY_ID]=RUB&rows[" + i + "][PRODUCT_ID]=0";
      }
      UrlFetchApp.fetch(B24_WEBHOOK_URL + "crm.lead.productrows.set" + productParams, options);
    }
    return { id: newLeadId, title: leadTitleText }; 
  } catch (e) { return { error: e.toString() }; }
}

function countOffersForOrder(sheet, parentId) {
  const colMap = getColumnHeaders(sheet);
  const data = sheet.getDataRange().getValues();
  const parentIdIndex = colMap['Parent ID'] - 1;
  const typeIndex = colMap['Тип'] - 1;
  
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][parentIdIndex]) === String(parentId) && data[i][typeIndex] === 'OFFER') count++;
  }
  return count;
}

function generateFinalOrderReceipt(car, leaderItems) {
    let lines = [getCarHeader(car)];
    leaderItems.forEach(item => {
        const price = item.adminPrice || item.sellerPrice || 0;
        const sym = (item.adminCurrency === 'USD') ? '$' : '₽';
        const name = item.AdminName || item.name;
        lines.push(`✅ | ${name} | ${item.quantity}шт | ${price}${sym}`);
    });
    return lines.join('\n');
}

function getAllOffersForOrder(sheet, orderId) {
    const colMap = getColumnHeaders(sheet);
    const data = sheet.getDataRange().getValues();
    const parentIdIndex = colMap['Parent ID'] - 1;
    const typeIndex = colMap['Тип'] - 1;
    const jsonIndex = colMap['JSON'] - 1;
    
    const offers = [];
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][parentIdIndex]) === String(orderId) && data[i][typeIndex] === 'OFFER') {
            try {
                const items = JSON.parse(data[i][jsonIndex]);
                offers.push({ items });
            } catch(e) {}
        }
    }
    return offers;
}

function formatCPMessage(orderId, row, sheet) {
  const colMap = getColumnHeaders(sheet);
  const jsonIndex = colMap['JSON'] - 1;
  const clientNameIndex = colMap['Имя'] - 1;
  const vinIndex = colMap['VIN'] - 1;
  
  let carStr = "Авто не указано";
  let bitrixId = null;
  let itemsHtml = "";
  let clientName = row[clientNameIndex];
  let leadTitle = clientName;
  let totalSum = 0;
  let currency = 'RUB';
  
  try {
      const json = JSON.parse(row[jsonIndex]);
      const car = json[0]?.car;
      bitrixId = json[0]?.bitrixId;
      carStr = getCarHeader(car);
      leadTitle = getExtendedCarTitle(car, clientName);
      
      const allOffers = getAllOffersForOrder(sheet, orderId);
      
      allOffers.forEach(off => {
          off.items.forEach(item => {
              if (item.rank === 'ЛИДЕР') {
                  const name = item.AdminName || item.name;
                  const price = item.adminPrice || item.sellerPrice || 0;
                  const cur = item.adminCurrency || item.sellerCurrency || 'RUB';
                  currency = cur;
                  const sym = (cur === 'USD') ? '$' : (cur === 'CNY' ? '¥' : '₽');
                  const qty = item.AdminQuantity || item.quantity || 1;
                  itemsHtml += `• ${name} — <b>${price} ${sym}</b> x <b>${qty}шт</b>\n`;
                  totalSum += price * qty;
              }
          });
      });
      
  } catch(e) { console.error(e); }

  const curSymbol = currency === 'USD' ? '$' : (currency === 'CNY' ? '¥' : '₽');

  let msg = `✅ <b>КП СФОРМИРОВАНО</b>\n`;
  msg += `Заказ: <code>${orderId}</code>\n\n`;
  
  msg += `🚘 <b>Машина:</b> ${carStr}\n`;
  msg += `👤 <b>Клиент:</b> ${clientName}\n`;
  msg += `🔢 <b>VIN:</b> <code>${row[vinIndex]}</code>\n\n`;
  
  msg += `📋 <b>ПОЗИЦИИ (Утверждено):</b>\n`;
  if (itemsHtml) {
      msg += itemsHtml;
      msg += `\n💰 <b>ИТОГО: ${totalSum.toLocaleString()} ${curSymbol}</b>\n`;
  }
  else msg += `(Нет позиций)\n`;

  if (bitrixId) {
      msg += `\n🔗 <a href="${B24_BASE_URL}/crm/lead/details/${bitrixId}/">${leadTitle}</a>`;
  } else {
      msg += `\n🔗 <a href="${B24_BASE_URL}/crm/lead/list/">Открыть CRM</a>`;
  }

  return msg;
}

function formatRefusalMessage(orderId, row, allOffers, sheet) {
  const colMap = getColumnHeaders(sheet);
  const clientName = row[colMap['Имя'] - 1];
  let carStr = "Не указано";
  let itemsHtml = "";
  let b24Id = null;
  let totalSum = 0;
  let leadTitle = clientName;

  try {
      const json = JSON.parse(row[colMap['JSON'] - 1]);
      const car = json[0]?.car;
      b24Id = json[0]?.bitrixId;
      carStr = getCarHeader(car);
      leadTitle = getExtendedCarTitle(car, clientName);
      
      const receiptText = String(row[colMap['Детали/Цены'] - 1] || '');
      const lines = receiptText.split('\n');
      lines.forEach((line, idx) => {
          if (idx === 0) return;
          if (line.includes('✅')) {
             const parts = line.split('|').map(p => p.trim());
             if (parts.length >= 4) {
                 const name = parts[1];
                 const qtyStr = parts[2];
                 const priceStr = parts[3];
                 
                 const qty = parseInt(qtyStr.replace(/\D/g, '')) || 1;
                 const price = parseInt(priceStr.replace(/\D/g, '')) || 0;
                 
                 totalSum += (price * qty);
                 itemsHtml += `• ${name} — <b>${priceStr}</b> x <b>${qty}шт</b>\n`;
             }
          }
      });
  } catch(e) {}

  let msg = `❌ <b>КЛИЕНТ ОТКАЗАЛСЯ</b>\n`;
  msg += `Заказ: <code>${orderId}</code>\n\n`;
  msg += `🚘 <b>Машина:</b> ${carStr}\n`;
  msg += `👤 <b>Клиент:</b> ${clientName}\n`;
  msg += `🔢 <b>VIN:</b> <code>${row[colMap['VIN'] - 1]}</code>\n\n`;

  msg += `📋 <b>ПОЗИЦИИ (Утверждено):</b>\n`;
  if (itemsHtml) msg += itemsHtml;
  else msg += `(Нет позиций)\n`;
  
  msg += `\n💰 <b>ИТОГО: ${totalSum.toLocaleString()} руб.</b>\n`;
  
  if (b24Id) {
    msg += `\n🔗 <a href="${B24_BASE_URL}/crm/lead/details/${b24Id}/">${leadTitle}</a>`;
  } else {
    msg += `\n🔗 <a href="${B24_BASE_URL}/crm/lead/list/">Открыть список лидов CRM</a>`;
  }
  return msg;
}

function formatAdminAnnulmentMessage(orderId, row, reason, sheet) {
  const colMap = getColumnHeaders(sheet);
  const clientName = row[colMap['Имя'] - 1];
  let carStr = "Не указано";
  let itemsHtml = "";
  let b24Id = null;
  let leadTitle = clientName;

  try {
      const json = JSON.parse(row[colMap['JSON'] - 1]);
      const car = json[0]?.car;
      b24Id = json[0]?.bitrixId;
      carStr = getExtendedCarTitle(car, "");
      leadTitle = getExtendedCarTitle(car, clientName);
      
      if (json && json.length > 0) {
          json.forEach(i => {
              itemsHtml += `• ${i.name} (${i.quantity} шт)\n`;
          });
      }
  } catch(e) {}

  let msg = `❌ <b>ЗАКАЗ ${orderId} был аннулирован</b>\n`;
  msg += `Заказ: <code>${orderId}</code>\n\n`;
  
  msg += `🚘 <b>Машина:</b> ${carStr}\n`;
  msg += `👤 <b>Клиент:</b> ${clientName}\n`;
  msg += `🔢 <b>VIN:</b> <code>${row[colMap['VIN'] - 1]}</code>\n\n`;

  msg += `📋 <b>ПОЗИЦИИ:</b>\n`;
  if (itemsHtml) msg += itemsHtml;
  else msg += `(Нет данных)\n`;
  
  msg += `\n❗ <b>Причина:</b> ${reason || "Не указана"}\n`;
  
  if (b24Id) {
    msg += `\n🔗 <a href="${B24_BASE_URL}/crm/lead/details/${b24Id}/">${leadTitle}</a>`;
  } else {
    msg += `\n🔗 <a href="${B24_BASE_URL}/crm/lead/list/">Открыть список лидов CRM</a>`;
  }
  return msg;
}

function formatPurchaseConfirmationMessage(orderId, row, sheet) {
  const colMap = getColumnHeaders(sheet);
  const jsonIndex = colMap['JSON'] - 1;
  const detailsIndex = colMap['Детали/Цены'] - 1;
  const clientNameIndex = colMap['Имя'] - 1;
  
  let carStr = "Авто не указано";
  let bitrixId = null;
  let itemsHtml = "";
  let totalSum = 0;
  let clientName = row[clientNameIndex];
  let leadTitle = clientName;
  
  try {
      const json = JSON.parse(row[jsonIndex]);
      const car = json[0]?.car;
      bitrixId = json[0]?.bitrixId;
      carStr = getCarHeader(car);
      leadTitle = getExtendedCarTitle(car, clientName);
      
      const receiptText = String(row[detailsIndex] || '');
      const lines = receiptText.split('\n');
      lines.forEach((line, idx) => {
          if (idx === 0) return;
          if (line.includes('✅')) {
             const parts = line.split('|').map(p => p.trim());
             if (parts.length >= 4) {
                 const name = parts[1];
                 const qtyStr = parts[2];
                 const priceStr = parts[3];
                 
                 const qty = parseInt(qtyStr.replace(/\D/g, '')) || 1;
                 const price = parseInt(priceStr.replace(/\D/g, '')) || 0;
                 
                 totalSum += (price * qty);
                 itemsHtml += `• ${name} — <b>${price}₽</b> x <b>${qty}шт</b>\n`;
             }
          }
      });
      
      if (totalSum === 0) {
          const allOffers = getAllOffersForOrder(sheet, orderId);
          allOffers.forEach(off => {
              off.items.forEach(item => {
                  if (item.rank === 'ЛИДЕР') {
                      const price = item.adminPrice || item.sellerPrice || 0;
                      const qty = item.AdminQuantity || item.quantity || 1;
                      totalSum += (price * qty);
                      itemsHtml += `• ${item.AdminName || item.name} — <b>${price}₽</b> x <b>${qty}шт</b>\n`;
                  }
              });
          });
      }

  } catch(e) {}

  let msg = `🛍 <b>КЛИЕНТ ГОТОВ КУПИТЬ</b>\n`;
  msg += `Заказ: <code>${orderId}</code>\n\n`;
  
  msg += `🚘 <b>Машина:</b> ${carStr}\n`;
  msg += `👤 <b>Клиент:</b> ${clientName}\n\n`;
  
  msg += `📋 <b>ПОЗИЦИИ:</b>\n`;
  msg += itemsHtml;
  
  msg += `\n💰 <b>ИТОГО: ${totalSum.toLocaleString()} руб.</b>\n`;

  if (bitrixId) {
      msg += `\n🔗 <a href="${B24_BASE_URL}/crm/lead/details/${bitrixId}/">${leadTitle}</a>\nСконвертируйте в сделку!`;
  } else {
      msg += `\n🔗 <a href="${B24_BASE_URL}/crm/lead/list/">Открыть CRM</a>`;
  }
  return msg;
}

function recalculateSummaryOrReceipt(sheet, orderId, orderItems) {
    const colMap = getColumnHeaders(sheet);
    const data = sheet.getDataRange().getValues();
    const allLeaderItems = [];
    
    const idIndex = colMap['ID'] - 1;
    const parentIdIndex = colMap['Parent ID'] - 1;
    const typeIndex = colMap['Тип'] - 1;
    const jsonIndex = colMap['JSON'] - 1;
    const detailsIndex = colMap['Детали/Цены'];
    
    let orderRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIndex]) === String(orderId)) {
            orderRowIndex = i;
            break;
        }
    }
    if (orderRowIndex === -1) return;

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][parentIdIndex]) === String(orderId) && data[i][typeIndex] === 'OFFER') {
            try {
                let oItems = JSON.parse(data[i][jsonIndex] || '[]');
                oItems.forEach(item => {
                    if (item.rank === 'ЛИДЕР') allLeaderItems.push(item);
                });
            } catch(e) {}
        }
    }

    let carInfo = null;
    if (orderItems.length > 0) carInfo = orderItems[0].car;

    if (allLeaderItems.length > 0) {
        sheet.getRange(orderRowIndex + 1, detailsIndex).setValue(generateFinalOrderReceipt(carInfo, allLeaderItems));
    } else {
        sheet.getRange(orderRowIndex + 1, detailsIndex).setValue(generateOrderSummary(orderItems));
    }
}

function propagateEditsToOffers(sheet, orderId, newOrderItems) {
    const colMap = getColumnHeaders(sheet);
    const data = sheet.getDataRange().getValues();
    const parentIdIndex = colMap['Parent ID'] - 1;
    const typeIndex = colMap['Тип'] - 1;
    const jsonIndex = colMap['JSON'];
    const detailsIndex = colMap['Детали/Цены'];
    
    const overrideMap = {};
    newOrderItems.forEach(i => {
        if (i.name) {
            overrideMap[i.name.trim().toLowerCase()] = {
                AdminName: i.AdminName,
                AdminQuantity: i.AdminQuantity,
                car: i.car
            };
        }
    });

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][parentIdIndex]) === String(orderId) && data[i][typeIndex] === 'OFFER') {
            let items = [];
            try { items = JSON.parse(data[i][jsonIndex - 1] || '[]'); } catch(e) {}
            
            let changed = false;
            items = items.map(item => {
                const key = item.name.trim().toLowerCase();
                if (overrideMap[key]) {
                    const updates = overrideMap[key];
                    if (updates.AdminName && item.AdminName !== updates.AdminName) { item.AdminName = updates.AdminName; changed = true; }
                    if (updates.AdminQuantity && item.AdminQuantity !== updates.AdminQuantity) { item.AdminQuantity = updates.AdminQuantity; changed = true; }
                    if (updates.car) { item.car = updates.car; changed = true; }
                }
                return item;
            });

            if (changed) {
                sheet.getRange(i + 1, jsonIndex).setValue(JSON.stringify(items));
                sheet.getRange(i + 1, detailsIndex).setValue(generateOfferSummary(items));
            }
        }
    }
}