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
 * ПОЛУЧЕНИЕ КАРТЫ КОЛОНОК (Регистронезависимая и обрезает пробелы)
 */
function getColumnHeaders(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colMap = {};
  headers.forEach((h, i) => {
      if (h) colMap[String(h).trim().toUpperCase()] = i + 1;
  });
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
    const idx = (name) => {
        const key = name.toUpperCase();
        return colMap[key] ? colMap[key] - 1 : -999;
    };
    
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
  return response({status: "alive", version: "8.0.0-styles-fixed"});
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
    const getCol = (name) => colMap[name.toUpperCase()];
    const body = contents;

    if (body.action === 'create' && body.order.type === 'ORDER') {
      const o = body.order;
      o.id = String(getNextId(sheet));
      
      // Initialize Rank
      if (o.items && Array.isArray(o.items)) {
          o.items = o.items.map(i => ({ ...i, rank: 'РЕЗЕРВ' }));
      }
      
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
      const setVal = (colName, val) => { 
          const idx = getCol(colName);
          if (idx) rowData[idx-1] = val; 
      };

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
      
      // Initialize Rank
      if (o.items && Array.isArray(o.items)) {
          o.items = o.items.map(i => ({ ...i, rank: 'РЕЗЕРВ' }));
      }

      const itemsJson = JSON.stringify(o.items);
      
      const rowData = new Array(sheet.getLastColumn()).fill('');
      const setVal = (colName, val) => { 
          const idx = getCol(colName);
          if (idx) rowData[idx-1] = val; 
      };

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
      
      // Set format to TEXT specifically for ID column before writing
      const idCol = getCol('ID');
      if (idCol) sheet.getRange(insertionIndex + 1, idCol).setNumberFormat("@");
      
      sheet.getRange(insertionIndex + 1, 1, 1, rowData.length).setValues([rowData]);
      
      const orderRowIndex = findOrderRowIndexById(sheet, o.parentId);
      const supplierStatusIdx = getCol('СТАТУС ПОСТАВЩИК');
      if (orderRowIndex > 0 && supplierStatusIdx) {
        sheet.getRange(orderRowIndex, supplierStatusIdx).setValue('Идут торги');
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
        const clientStatusIdx = getCol('СТАТУС КЛИЕНТ');
        const adminStatusIdx = getCol('СТАТУС АДМИН');
        
        if (clientStatusIdx) sheet.getRange(orderRowIndex, clientStatusIdx).setValue('КП готово');
        if (adminStatusIdx) sheet.getRange(orderRowIndex, adminStatusIdx).setValue('КП отправлено');
        
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
        const clientStatusIdx = getCol('СТАТУС КЛИЕНТ');
        const adminStatusIdx = getCol('СТАТУС АДМИН');
        if (clientStatusIdx) sheet.getRange(orderRowIndex, clientStatusIdx).setValue('Подтверждение от поставщика');
        if (adminStatusIdx) sheet.getRange(orderRowIndex, adminStatusIdx).setValue('Готов купить');
      }
      try {
         broadcastMessage(formatPurchaseConfirmationMessage(body.orderId, findOrderRowById(sheet, body.orderId), sheet), doc.getSheetByName('Subscribers'));
      } catch(e){}
    }
    else if (body.action === 'refuse_order') {
       const idx = findOrderRowIndexById(sheet, body.orderId);
       if (idx > 0) {
         const status = body.source === 'ADMIN' ? 'Аннулирован' : 'Отказ';
         const clientStatusIdx = getCol('СТАТУС КЛИЕНТ');
         const adminStatusIdx = getCol('СТАТУС АДМИН');
         const mainStatusIdx = getCol('Статус');
         const jsonIdx = getCol('JSON');

         if(clientStatusIdx) sheet.getRange(idx, clientStatusIdx).setValue(status);
         if(adminStatusIdx) sheet.getRange(idx, adminStatusIdx).setValue(status);
         if(mainStatusIdx) sheet.getRange(idx, mainStatusIdx).setValue('ЗАКРЫТ');
         if (body.reason && jsonIdx) {
            try {
                let items = JSON.parse(sheet.getRange(idx, jsonIdx).getValue() || '[]');
                if (items.length > 0) { 
                    items[0].refusalReason = body.reason; 
                    sheet.getRange(idx, jsonIdx).setValue(JSON.stringify(items)); 
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
        const clientStatusIdx = getCol('СТАТУС КЛИЕНТ');
        const adminStatusIdx = getCol('СТАТУС АДМИН');
        if(clientStatusIdx) sheet.getRange(idx, clientStatusIdx).setValue(body.status);
        if(adminStatusIdx) sheet.getRange(idx, adminStatusIdx).setValue(body.status);
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

/**
 * RANK UPDATE LOGIC
 */
function handleRankUpdate(sheet, body, doc) {
  const { vin, detailName, leadOfferId, adminPrice, adminCurrency, adminComment, deliveryRate } = body;
  const colMap = getColumnHeaders(sheet);
  const data = sheet.getDataRange().getValues();
  const getCol = (name) => colMap[name.toUpperCase()];
  
  const idIndex = getCol('ID') - 1;
  const parentIdIndex = getCol('Parent ID') - 1;
  const typeIndex = getCol('Тип') - 1;
  const jsonIndex = getCol('JSON'); // 1-based
  const detailsIndex = getCol('Детали/Цены'); // 1-based
  
  logAction(doc, `Rank Update Start for ${detailName}`, 'DEBUG', {leadOfferId});

  let parentId = null;
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

  let orderRowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]) === String(parentId)) {
      orderRowIndex = i;
      break;
    }
  }

  const targetNameLower = detailName.trim().toLowerCase();
  const isReset = body.actionType === 'RESET'; 
  let updateCount = 0;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][parentIdIndex]) === String(parentId) && data[i][typeIndex] === 'OFFER') {
        let items = [];
        try { items = JSON.parse(data[i][jsonIndex - 1] || '[]'); } catch(e) {}
        
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
                        item.rank = 'ЛИДЕР';
                        if (adminPrice !== undefined) item.adminPrice = adminPrice;
                        if (adminCurrency !== undefined) item.adminCurrency = adminCurrency;
                        if (adminComment !== undefined) item.adminComment = adminComment;
                        if (deliveryRate !== undefined) item.deliveryRate = deliveryRate;
                        changed = true;
                    } else {
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
            sheet.getRange(i + 1, jsonIndex).setValue(JSON.stringify(items));
            sheet.getRange(i + 1, detailsIndex).setValue(generateOfferSummary(items));
            updateCount++;
        }
    }
  }
  
  SpreadsheetApp.flush(); // CRITICAL FIX: Ensure data is written before re-reading

  logAction(doc, `Rank Update Finished. Updated ${updateCount} rows`, 'DEBUG');

  const allLeaderItems = [];
  let carInfo = null;
  const freshData = sheet.getDataRange().getValues();
  
  for (let i = 1; i < freshData.length; i++) {
      if (String(freshData[i][parentIdIndex]) === String(parentId) && freshData[i][typeIndex] === 'OFFER') {
         let oItems = JSON.parse(freshData[i][jsonIndex - 1] || '[]');
         oItems.forEach(item => {
             if (item.rank === 'ЛИДЕР' || item.rank === 'LEADER') allLeaderItems.push(item);
         });
      }
   }
   
   if (orderRowIndex !== -1) {
       try { 
           // 1. Parse Order Items
           let orderItems = JSON.parse(freshData[orderRowIndex][jsonIndex - 1] || '[]');
           
           // 2. Create a map of Winners
           const winnerMap = {};
           allLeaderItems.forEach(item => {
               winnerMap[(item.AdminName || item.name).trim().toLowerCase()] = item;
               winnerMap[item.name.trim().toLowerCase()] = item; // Fallback
           });

           // 3. Update Order Items with AdminCHOOSErankLeader
           let orderUpdated = false;
           orderItems = orderItems.map(oi => {
               const key = (oi.AdminName || oi.name).trim().toLowerCase();
               const winner = winnerMap[key];
               
               if (winner) {
                   oi.AdminCHOOSErankLeader = {
                       status: 'ЛИДЕР',
                       price: winner.adminPrice || winner.sellerPrice,
                       currency: winner.adminCurrency || winner.sellerCurrency,
                       supplier: winner.clientName, 
                       deliveryWeeks: winner.deliveryWeeks
                   };
                   orderUpdated = true;
               } else {
                   if (oi.AdminCHOOSErankLeader) {
                       delete oi.AdminCHOOSErankLeader;
                       orderUpdated = true;
                   }
               }
               return oi;
           });

           // 4. Save Order JSON back if changed
           if (orderUpdated) {
               sheet.getRange(orderRowIndex + 1, jsonIndex).setValue(JSON.stringify(orderItems));
           }

           const firstItem = orderItems[0];
           carInfo = firstItem.car;
           if (carInfo && carInfo.AdminModel) carInfo.model = carInfo.AdminModel; 
           if (carInfo && carInfo.AdminYear) carInfo.year = carInfo.AdminYear;
       } catch(e){
           logAction(doc, `Error updating Order JSON: ${e.toString()}`, 'ERROR');
       }
       sheet.getRange(orderRowIndex + 1, detailsIndex).setValue(generateFinalOrderReceipt(carInfo, allLeaderItems));
   }
   
   updateSupplierStatuses(sheet, parentId);
}

function updateOrderReceipt(sheet, orderId) {
  // Replaced by inline logic in handleRankUpdate, but kept for other calls
  const colMap = getColumnHeaders(sheet);
  const getCol = (name) => colMap[name.toUpperCase()];
  const idIndex = getCol('ID') - 1;
  const parentIdIndex = getCol('Parent ID') - 1;
  const typeIndex = getCol('Тип') - 1;
  const jsonIndex = getCol('JSON') - 1;
  const detailsIndex = getCol('Детали/Цены'); // 1-based
  const data = sheet.getDataRange().getValues();

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
           try {
               const raw = JSON.parse(data[orderRowIndex][jsonIndex]);
               sheet.getRange(orderRowIndex + 1, detailsIndex).setValue(generateOrderSummary(raw));
           } catch(e){}
       }
   }
}

function updateSupplierStatuses(sheet, orderId) {
    const colMap = getColumnHeaders(sheet);
    const getCol = (name) => colMap[name.toUpperCase()];
    const data = sheet.getDataRange().getValues();
    const parentIdIndex = getCol('Parent ID') - 1;
    const typeIndex = getCol('Тип') - 1;
    const jsonIndex = getCol('JSON') - 1;
    const supplierStatusColNum = getCol('СТАТУС ПОСТАВЩИК');

    if (!supplierStatusColNum) return;

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][parentIdIndex]) === String(orderId) && data[i][typeIndex] === 'OFFER') {
            try {
                const items = JSON.parse(data[i][jsonIndex] || '[]');
                const totalItems = items.filter(it => (it.offeredQuantity || 0) > 0).length;
                const leaderCount = items.filter(item => item.rank === 'ЛИДЕР' || item.rank === 'LEADER').length;
                
                let offerStatus = 'Идут торги'; 
                if (totalItems > 0) {
                    if (leaderCount === totalItems) offerStatus = 'Выиграл';
                    else if (leaderCount > 0) offerStatus = 'Частично выиграл';
                    else offerStatus = 'Проиграл';
                }
                sheet.getRange(i + 1, supplierStatusColNum).setValue(offerStatus);
            } catch(e) {}
        }
    }
}

/**
 * HELPERS
 */
function getOrCreateSheet(doc, name, headers) {
  let s = doc.getSheetByName(name);
  if (!s) { 
    s = doc.insertSheet(name); 
    s.appendRow(headers); 
    s.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e5e7eb"); 
    s.setFrozenRows(1); 
    
    // FORCE TEXT FORMAT FOR ID COLUMNS (A & B)
    s.getRange("A:B").setNumberFormat("@");
    
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

function findOrderRowIndexById(sheet, id) {
  const colMap = getColumnHeaders(sheet);
  const idIdx = colMap['ID'] ? colMap['ID'] - 1 : 0;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) { if (String(data[i][idIdx]) === String(id)) return i + 1; }
  return -1;
}

function findOrderRowById(sheet, id) {
  const colMap = getColumnHeaders(sheet);
  const idIdx = colMap['ID'] ? colMap['ID'] - 1 : 0;
  const data = sheet.getDataRange().getValues();
  for (let i =1; i < data.length; i++) { if (String(data[i][idIdx]) === String(id)) return data[i]; }
  return null;
}

function getNextId(sheet) {
  const colMap = getColumnHeaders(sheet);
  const idIdx = colMap['ID'] ? colMap['ID'] - 1 : 0;
  const data = sheet.getDataRange().getValues();
  let max = 0;
  for (let i = 1; i < data.length; i++) {
    const val = data[i][idIdx];
    if (val && !isNaN(val)) {
      const num = Number(val);
      if (num < 1000000 && num > max) max = num;
    }
  }
  return max + 1;
}

function updateCellByColumnName(sheet, id, columnName, value) {
  const colMap = getColumnHeaders(sheet);
  const colNum = colMap[columnName.toUpperCase()];
  if (!colNum) return;
  const idx = findOrderRowIndexById(sheet, id);
  if (idx > 0) sheet.getRange(idx, colNum).setValue(value);
}

function setupValidations(sheet) {
  const colMap = getColumnHeaders(sheet);
  const lastRow = Math.max(sheet.getLastRow(), 2);
  const setRule = (colName, options) => {
    const colNum = colMap[colName.toUpperCase()];
    if (!colNum) return;
    const range = sheet.getRange(2, colNum, lastRow - 1, 1);
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

function findBlockEndIndex(sheet, parentId) {
  const colMap = getColumnHeaders(sheet);
  const idIdx = colMap['ID'] ? colMap['ID'] - 1 : 0;
  const parentIdIdx = colMap['PARENT ID'] ? colMap['PARENT ID'] - 1 : 1;
  const data = sheet.getDataRange().getValues();
  let lastIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === String(parentId) || String(data[i][parentIdIdx]) === String(parentId)) lastIndex = i + 1;
    else if (lastIndex !== -1) break; 
  }
  return lastIndex === -1 ? sheet.getLastRow() : lastIndex;
}

function formatSheetStyles(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const colMap = getColumnHeaders(sheet);
  const getCol = (name) => colMap[name.toUpperCase()];
  
  // 1. DATA TYPES (COL A & B -> TEXT)
  sheet.getRange(2, 1, lastRow - 1, 2).setNumberFormat("@");

  // 2. ALIGNMENT (A-H -> Left)
  sheet.getRange(2, 1, lastRow - 1, 8).setHorizontalAlignment("left");

  // 3. BOLDING
  const idCol = getCol('ID');
  const nameCol = getCol('ИМЯ');
  const phoneCol = getCol('ТЕЛЕФОН');
  if (idCol) sheet.getRange(2, idCol, lastRow - 1, 1).setFontWeight("bold");
  if (nameCol) sheet.getRange(2, nameCol, lastRow - 1, 1).setFontWeight("bold");
  if (phoneCol) sheet.getRange(2, phoneCol, lastRow - 1, 1).setFontWeight("bold");

  // 4. JSON COLUMN (Width 100, Clip)
  const jsonCol = getCol('JSON');
  if (jsonCol) {
    sheet.setColumnWidth(jsonCol, 100);
    sheet.getRange(2, jsonCol, lastRow-1, 1).setWrap(false).setNumberFormat("@");
  }

  // 5. DETAILS COLUMN (Width 300, Wrap)
  const detailsCol = getCol('Детали/Цены');
  if (detailsCol) {
    sheet.setColumnWidth(detailsCol, 300);
    sheet.getRange(2, detailsCol, lastRow-1, 1).setWrap(true);
  }
  
  // 6. AUTO-RESIZE J-O (Columns 10-15) - Optional, can be slow
  // try { sheet.autoResizeColumns(10, 6); } catch(e) {}
}

function formatRows(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;
  const colMap = getColumnHeaders(sheet);
  const getCol = (name) => colMap[name.toUpperCase()];
  const typeIdx = getCol('Тип') ? getCol('Тип')-1 : -1;
  const sSupIdx = getCol('СТАТУС ПОСТАВЩИК') ? getCol('СТАТУС ПОСТАВЩИК')-1 : -1;
  const sCliIdx = getCol('СТАТУС КЛИЕНТ') ? getCol('СТАТУС КЛИЕНТ')-1 : -1;

  if (typeIdx === -1) return;

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

/**
 * MESSAGING & TG
 */
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

function countOffersForOrder(sheet, parentId) {
  const colMap = getColumnHeaders(sheet);
  const data = sheet.getDataRange().getValues();
  const parentIdIndex = colMap['PARENT ID'] ? colMap['PARENT ID'] - 1 : 1;
  const typeIndex = colMap['ТИП'] ? colMap['ТИП'] - 1 : 2;
  
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][parentIdIndex]) === String(parentId) && data[i][typeIndex] === 'OFFER') count++;
  }
  return count;
}

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
            const nameIdx = colMap['ИМЯ'] ? colMap['ИМЯ'] - 1 : 5;
            const jsonIdx = colMap['JSON'] ? colMap['JSON'] - 1 : 8;
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

function generateFinalOrderReceipt(car, leaderItems) {
    let lines = [getCarHeader(car)];
    leaderItems.forEach(item => {
        const price = item.adminPrice || item.sellerPrice || 0;
        const sym = (item.adminCurrency === 'USD') ? '$' : (item.adminCurrency === 'CNY' ? '¥' : '₽');
        const name = item.AdminName || item.name;
        lines.push(`✅ | ${name} | ${item.quantity}шт | ${price}${sym}`);
    });
    return lines.join('\n');
}

function getAllOffersForOrder(sheet, orderId) {
    const colMap = getColumnHeaders(sheet);
    const data = sheet.getDataRange().getValues();
    const parentIdIndex = colMap['PARENT ID'] ? colMap['PARENT ID'] - 1 : 1;
    const typeIndex = colMap['ТИП'] ? colMap['ТИП'] - 1 : 2;
    const jsonIndex = colMap['JSON'] ? colMap['JSON'] - 1 : 8;
    
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
  const jsonIndex = colMap['JSON'] ? colMap['JSON'] - 1 : 8;
  const clientNameIndex = colMap['ИМЯ'] ? colMap['ИМЯ'] - 1 : 5;
  const vinIndex = colMap['VIN'] ? colMap['VIN'] - 1 : 4;
  
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
  const clientName = row[colMap['ИМЯ'] ? colMap['ИМЯ'] - 1 : 5];
  let carStr = "Не указано";
  let itemsHtml = "";
  let b24Id = null;
  let totalSum = 0;
  let leadTitle = clientName;

  try {
      const json = JSON.parse(row[colMap['JSON'] ? colMap['JSON'] - 1 : 8]);
      const car = json[0]?.car;
      b24Id = json[0]?.bitrixId;
      carStr = getCarHeader(car);
      leadTitle = getExtendedCarTitle(car, clientName);
      
      const receiptText = String(row[colMap['ДЕТАЛИ/ЦЕНЫ'] ? colMap['ДЕТАЛИ/ЦЕНЫ'] - 1 : 9] || '');
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
  msg += `🔢 <b>VIN:</b> <code>${row[colMap['VIN'] ? colMap['VIN'] - 1 : 4]}</code>\n\n`;

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
  const clientName = row[colMap['ИМЯ'] ? colMap['ИМЯ'] - 1 : 5];
  let carStr = "Не указано";
  let itemsHtml = "";
  let b24Id = null;
  let leadTitle = clientName;

  try {
      const json = JSON.parse(row[colMap['JSON'] ? colMap['JSON'] - 1 : 8]);
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
  msg += `🔢 <b>VIN:</b> <code>${row[colMap['VIN'] ? colMap['VIN'] - 1 : 4]}</code>\n\n`;

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
  const jsonIndex = colMap['JSON'] ? colMap['JSON'] - 1 : 8;
  const detailsIndex = colMap['ДЕТАЛИ/ЦЕНЫ'] ? colMap['ДЕТАЛИ/ЦЕНЫ'] - 1 : 9;
  const clientNameIndex = colMap['ИМЯ'] ? colMap['ИМЯ'] - 1 : 5;
  
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
    
    const idIndex = colMap['ID'] ? colMap['ID'] - 1 : 0;
    const parentIdIndex = colMap['PARENT ID'] ? colMap['PARENT ID'] - 1 : 1;
    const typeIndex = colMap['ТИП'] ? colMap['ТИП'] - 1 : 2;
    const jsonIndex = colMap['JSON'] ? colMap['JSON'] - 1 : 8;
    const detailsIndex = colMap['ДЕТАЛИ/ЦЕНЫ'] ? colMap['ДЕТАЛИ/ЦЕНЫ'] : 10;
    
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
    const parentIdIndex = colMap['PARENT ID'] ? colMap['PARENT ID'] - 1 : 1;
    const typeIndex = colMap['ТИП'] ? colMap['ТИП'] - 1 : 2;
    const jsonIndex = colMap['JSON'] ? colMap['JSON'] : 9;
    const detailsIndex = colMap['ДЕТАЛИ/ЦЕНЫ'] ? colMap['ДЕТАЛИ/ЦЕНЫ'] : 10;
    
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