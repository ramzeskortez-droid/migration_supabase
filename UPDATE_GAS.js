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
  return response({status: "alive", version: "6.2.0-logging"});
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
        
        const data = sheet.getDataRange().getValues();
        const jsonIdx = colMap['JSON'] - 1;
        const parentIdx = colMap['Parent ID'] - 1;
        const typeIdx = colMap['Тип'] - 1;
        const supplierStatusIdx = colMap['СТАТУС ПОСТАВЩИК'];

        for (let i = 1; i < data.length; i++) {
          if (String(data[i][parentIdx]) === String(body.orderId) && data[i][typeIdx] === 'OFFER') {
            try {
              const items = JSON.parse(data[i][jsonIdx] || '[]');
              const leaderCount = items.filter(item => item.rank === 'ЛИДЕР' || item.rank === 'LEADER').length;
              let offerStatus = leaderCount === items.length ? 'Выиграл' : (leaderCount > 0 ? 'Частично выиграл' : 'Проиграл');
              if(supplierStatusIdx) sheet.getRange(i + 1, supplierStatusIdx).setValue(offerStatus);
            } catch(e) {}
          }
        }
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
  const { vin, detailName, leadOfferId, adminPrice, adminCurrency } = body;
  const colMap = getColumnHeaders(sheet);
  const data = sheet.getDataRange().getValues();
  
  const idIndex = colMap['ID'] - 1;
  const parentIdIndex = colMap['Parent ID'] - 1;
  const typeIndex = colMap['Тип'] - 1;
  const jsonIndex = colMap['JSON']; // 1-based
  const detailsIndex = colMap['Детали/Цены']; // 1-based
  
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
                        if (item.rank !== 'ЛИДЕР') {
                            item.rank = 'ЛИДЕР';
                            if (adminPrice !== undefined) item.adminPrice = adminPrice;
                            if (adminCurrency !== undefined) item.adminCurrency = adminCurrency;
                            changed = true;
                        }
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
  
  SpreadsheetApp.flush(); // CRITICAL: Write changes before re-reading

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
           const rawOrderItems = JSON.parse(freshData[orderRowIndex][jsonIndex - 1]);
           const firstItem = rawOrderItems[0];
           carInfo = firstItem.car;
           if (carInfo && carInfo.AdminModel) carInfo.model = carInfo.AdminModel; 
           if (carInfo && carInfo.AdminYear) carInfo.year = carInfo.AdminYear;
       } catch(e){}
       sheet.getRange(orderRowIndex + 1, detailsIndex).setValue(generateFinalOrderReceipt(carInfo, allLeaderItems));
   }
   
   // FORCE UPDATE SUPPLIER STATUSES
   updateSupplierStatuses(sheet, parentId);
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
    if (currentHeaders.indexOf('Телефон') === -1) {
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
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) { if (String(data[i][0]) === String(id)) return i + 1; }
  return -1;
}

function findOrderRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i =1; i < data.length; i++) { if (String(data[i][0]) === String(id)) return data[i]; }
  return null;
}

function getNextId(sheet) {
  const data = sheet.getDataRange().getValues();
  let max = 0;
  for (let i = 1; i < data.length; i++) {
    const val = data[i][0];
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

function findBlockEndIndex(sheet, parentId) {
  const data = sheet.getDataRange().getValues();
  let lastIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(parentId) || String(data[i][1]) === String(parentId)) lastIndex = i + 1;
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