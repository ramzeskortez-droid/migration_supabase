/**
 * КОНФИГУРАЦИЯ
 */
const TELEGRAM_TOKEN = '8584425867:AAFbjHHrSLYx6hdiXnNaaBx2dR7cD9NG2jw';
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxooqVnUce3SIllt2RUtG-KJ5EzNswyHqrTpdsTGhc6XOKW6qaUdlr6ld77LR2KQz0-/exec';

// URL вебхука Битрикс24
const B24_WEBHOOK_URL = "https://drave5inb2.temp.swtest.ru/rest/1/zt6j93x9rzn0jhtc/";
const B24_BASE_URL = "https://drave5inb2.temp.swtest.ru";

// Список статусов для выпадающих списков
const STATUS_LIST = [
  "В обработке", "КП готово", "Готов купить", "Подтверждение от поставщика", 
  "Ожидает оплаты", "В пути", "Выполнен", "Аннулирован", "Отказ", "ОТКРЫТ", "ЗАКРЫТ"
];

/**
 * ТОЧКА ВХОДА GET
 */
function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getData') {
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = doc.getSheetByName('MarketData');
    if (!sheet) return response([]);
    
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);
    
    return response(rows.map(r => ({
      id: r[0], 
      parentId: r[1], 
      type: r[2], 
      statusAdmin: r[3], 
      statusClient: r[4], 
      statusSeller: r[5], 
      workflowStatus: r[6],
      vin: r[7], 
      clientName: r[8], 
      summary: r[9], 
      json: r[10], 
      rank: r[11], 
      createdAt: r[12], 
      location: r[13], 
      refusal: r[14]
    })));
  }
  return response({status: "alive", version: "5.0.0-triple-status"});
}

/**
 * ТОЧКА ВХОДА POST
 */
function doPost(e) {
  if (!e || !e.postData) return response({error: "No post data"});
  
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(30000); 
  
  try {
    const contents = JSON.parse(e.postData.contents);
    const doc = SpreadsheetApp.getActiveSpreadsheet();

    if (contents.message || contents.callback_query) {
      const subSheet = getOrCreateSheet(doc, 'Subscribers', ['ChatID', 'Username', 'Date']);
      handleTelegramUpdate(contents, subSheet);
      return response({status: 'telegram_ok'});
    }

    const sheet = getOrCreateSheet(doc, 'MarketData', [
      'ID', 'Parent ID', 'Тип', 'Статус Админ', 'Статус Клиент', 'Статус Поставщик', 'Workflow', 'VIN', 'Имя', 'Сводка', 'JSON', 'Детали/Цены', 'Дата', 'Локация', 'ОТКАЗ'
    ]);
    const body = contents;

    // --- CREATE ORDER ---
    if (body.action === 'create' && body.order.type === 'ORDER') {
      const o = body.order;
      const newId = String(getNextId(sheet));
      o.id = newId;

      var b24Result = addLeadWithTg(o);
      if (b24Result && b24Result.id && o.items.length > 0) {
        o.items[0].bitrixId = b24Result.id;
      }

      const itemsJson = JSON.stringify(o.items);
      const summary = (o.items || []).map(i => `${i.name} (${i.quantity} шт)`).join(', ');
      const formattedDate = (o.createdAt || '').replace(', ', '\n');
      const readableStatus = generateOrderSummary(o.items);

      // Col 4:Admin, 5:Client, 6:Seller, 7:Workflow
      const rowData = [
        o.id, '', 'ORDER', 'ОТКРЫТ', 'В обработке', 'В обработке', 'В обработке', o.vin, o.clientName, summary, itemsJson, readableStatus, formattedDate, o.location || 'РФ', 'N'
      ];
      
      sheet.insertRowAfter(1);
      sheet.getRange(2, 1, 1, rowData.length).setValues([rowData]);
      applyStatusValidation(sheet, 2); 
      
      const subSheet = doc.getSheetByName('Subscribers');
      broadcastMessage(formatNewOrderMessage(o, b24Result), subSheet);

      formatSheetStyles(sheet);
      formatRows(sheet); 
      return response({status: 'ok', orderId: newId});
    } 
    // --- CREATE OFFER ---
    else if (body.action === 'create' && body.order.type === 'OFFER') {
      const o = body.order;
      const offerNum = countOffersForOrder(sheet, o.parentId) + 1;
      const newOfferId = `${o.parentId}-${offerNum}`;
      o.id = newOfferId;

      const itemsJson = JSON.stringify(o.items);
      const rowData = [o.id, o.parentId, 'OFFER', 'ОТКРЫТ', '', '', '', o.vin, o.clientName, 'Предложение', itemsJson, generateOfferSummary(o.items), (o.createdAt || '').replace(', ', '\n'), o.location || 'РФ', 'N'];
      const insertionIndex = findBlockEndIndex(sheet, o.parentId);
      sheet.insertRowAfter(insertionIndex);
      sheet.getRange(insertionIndex + 1, 1, 1, rowData.length).setValues([rowData]);
      
      const subSheet = doc.getSheetByName('Subscribers');
      const parentRow = findOrderRowById(sheet, o.parentId);
      const msg = formatNewOfferMessage(o, offerNum, parentRow);
      broadcastMessage(msg, subSheet);

      formatSheetStyles(sheet);
      formatRows(sheet); 
      return response({status: 'ok', offerId: newOfferId});
    }
    // --- FORM CP ---
    else if (body.action === 'form_cp') {
      updateStatusById(sheet, body.orderId, 4, 'КП готово'); // Admin
      updateStatusById(sheet, body.orderId, 5, 'КП готово'); // Client
      updateStatusById(sheet, body.orderId, 7, 'КП отправлено'); // Workflow
      const orderRow = findOrderRowById(sheet, body.orderId);
      const subSheet = doc.getSheetByName('Subscribers');
      broadcastMessage(orderRow ? formatCPMessage(body.orderId, orderRow) : `✅ <b>КП СФОРМИРОВАНО</b>\nЗаказ: <code>${body.orderId}</code>`, subSheet);
    }
    // --- CONFIRM PURCHASE ---
    else if (body.action === 'confirm_purchase') {
      updateStatusById(sheet, body.orderId, 4, 'Готов купить'); // Admin
      updateStatusById(sheet, body.orderId, 5, 'Подтверждение от поставщика'); // Client
      updateStatusById(sheet, body.orderId, 6, 'Подтверждение от поставщика'); // Seller
      updateStatusById(sheet, body.orderId, 7, 'Готов купить'); // Workflow
      const orderRow = findOrderRowById(sheet, body.orderId);
      if (orderRow) {
        const subSheet = doc.getSheetByName('Subscribers');
        broadcastMessage(formatPurchaseConfirmationMessage(body.orderId, orderRow), subSheet);
      }
    }
    // --- UPDATE WORKFLOW STATUS ---
    else if (body.action === 'update_workflow_status') {
       const s = body.status;
       updateStatusById(sheet, body.orderId, 4, s); 
       updateStatusById(sheet, body.orderId, 5, s); 
       updateStatusById(sheet, body.orderId, 6, s); 
       updateStatusById(sheet, body.orderId, 7, s); 
    }
    // --- REFUSE ORDER ---
    else if (body.action === 'refuse_order') {
       updateStatusById(sheet, body.orderId, 15, 'Y'); 
       const status = body.source === 'ADMIN' ? 'Аннулирован' : 'Отказ';
       updateStatusById(sheet, body.orderId, 4, status);
       updateStatusById(sheet, body.orderId, 5, status);
       updateStatusById(sheet, body.orderId, 6, status);
       updateStatusById(sheet, body.orderId, 7, status); 
       
       if (body.reason) {
          const orderRow = findOrderRowById(sheet, body.orderId);
          if (orderRow) {
             try {
                const items = JSON.parse(orderRow[10]); 
                if (items.length > 0) {
                    items[0].refusalReason = body.reason;
                    updateStatusById(sheet, body.orderId, 11, JSON.stringify(items));
                }
             } catch(e) {}
          }
       }
       
       const orderRow = findOrderRowById(sheet, body.orderId); 
       if (orderRow) {
         const subSheet = doc.getSheetByName('Subscribers');
         const allOffers = getAllOffersForOrder(sheet, body.orderId);
         if (body.source === 'ADMIN') {
             broadcastMessage(formatAdminAnnulmentMessage(body.orderId, orderRow, body.reason), subSheet);
         } else {
             broadcastMessage(formatRefusalMessage(body.orderId, orderRow, allOffers), subSheet);
         }
       }
    }
    else if (body.action === 'update_json') {
       const oldRow = findOrderRowById(sheet, body.orderId);
       let oldItems = [];
       try { oldItems = JSON.parse(oldRow[10]); } catch(e){}
       
       if (oldItems.length > 0 && oldItems[0].bitrixId) {
           if (body.items.length > 0) {
               body.items[0].bitrixId = oldItems[0].bitrixId;
           }
       }

       updateStatusById(sheet, body.orderId, 11, JSON.stringify(body.items));
       const summary = body.items.map(i => `${i.AdminName || i.name} (${i.quantity} шт)`).join(', ');
       updateStatusById(sheet, body.orderId, 10, summary);
       
       propagateEditsToOffers(sheet, body.orderId, body.items);
       recalculateSummaryOrReceipt(sheet, body.orderId, body.items);
    }
    else if (body.action === 'close_order') {
      closeOrderInSheet(sheet, body.orderId);
    }
    else if (body.action === 'update_rank') {
      handleRankUpdate(sheet, body);
    }

    formatSheetStyles(sheet);
    formatRows(sheet); 
    return response({status: 'ok'});
  } catch (err) {
    return response({error: err.toString()});
  } finally {
    if (hasLock) lock.releaseLock();
  }
}

// --- HELPER FUNCTIONS ---

function applyStatusValidation(sheet, rowIdx) {
  const range = sheet.getRange(rowIdx, 4, 1, 4); // Columns 4, 5, 6, 7
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_LIST)
    .setAllowInvalid(false)
    .build();
  range.setDataValidation(rule);
}

function getCarHeader(car) {
    if (!car) return "Авто не указано";
    const brand = car.brand || "";
    const model = car.AdminModel || car.model || "";
    const year = car.AdminYear || car.year || "";
    return [brand, model, year].filter(Boolean).join(' | ');
}

function getExtendedCarTitle(car, clientName) {
    if (!car) return clientName;
    const brand = car.brand || "";
    const model = car.AdminModel || car.model || "";
    const year = car.AdminYear || car.year || "";
    const parts = [brand, model, year, clientName].filter(Boolean);
    return parts.join(' | ');
}

function recalculateSummaryOrReceipt(sheet, orderId, orderItems) {
    const data = sheet.getDataRange().getValues();
    const allLeaderItems = [];
    
    let orderRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(orderId)) {
            orderRowIndex = i;
            break;
        }
    }
    if (orderRowIndex === -1) return;

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][1]) === String(orderId) && data[i][2] === 'OFFER') {
            try {
                let oItems = JSON.parse(data[i][10] || '[]');
                oItems.forEach(item => {
                    if (item.rank === 'ЛИДЕР') allLeaderItems.push(item);
                });
            } catch(e) {}
        }
    }

    let carInfo = null;
    if (orderItems.length > 0) carInfo = orderItems[0].car;

    if (allLeaderItems.length > 0) {
        sheet.getRange(orderRowIndex + 1, 12).setValue(generateFinalOrderReceipt(carInfo, allLeaderItems));
    } else {
        sheet.getRange(orderRowIndex + 1, 12).setValue(generateOrderSummary(orderItems));
    }
}

function propagateEditsToOffers(sheet, orderId, newOrderItems) {
    const data = sheet.getDataRange().getValues();
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
        if (String(data[i][1]) === String(orderId) && data[i][2] === 'OFFER') {
            let items = [];
            try { items = JSON.parse(data[i][10] || '[]'); } catch(e) {}
            
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
                sheet.getRange(i + 1, 11).setValue(JSON.stringify(items));
                sheet.getRange(i + 1, 12).setValue(generateOfferSummary(items));
            }
        }
    }
}

function handleRankUpdate(sheet, body) {
  const { detailName, leadOfferId, adminPrice, adminCurrency, adminComment, deliveryRate } = body;
  const data = sheet.getDataRange().getValues();
  
  const targetOfferId = String(leadOfferId).trim();
  const targetNameLower = String(detailName).trim().toLowerCase();
  const isReset = body.actionType === 'RESET'; 

  let parentId = null;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === targetOfferId) {
      parentId = String(data[i][1]).trim();
      break;
    }
  }
  if (!parentId) return;

  for (let i = 1; i < data.length; i++) {
    const rowParentId = String(data[i][1]).trim();
    if (rowParentId === parentId && data[i][2] === 'OFFER') {
        let items = [];
        try { items = JSON.parse(data[i][10] || '[]'); } catch(e) {}
        
        let changed = false;
        items = items.map(item => {
            const currentItemName = String(item.AdminName || item.name || "").trim().toLowerCase();
            const originalItemName = String(item.name || "").trim().toLowerCase();
            const match = currentItemName === targetNameLower || originalItemName === targetNameLower;
            
            if (match) {
                if (isReset) {
                    if (item.rank === 'ЛИДЕР') {
                        item.rank = 'РЕЗЕРВ';
                        if (adminComment !== undefined) item.adminComment = adminComment;
                        changed = true;
                    }
                } else {
                    if (String(data[i][0]).trim() === targetOfferId) {
                        item.rank = 'ЛИДЕР';
                        if (adminPrice !== undefined) item.adminPrice = adminPrice;
                        if (adminCurrency !== undefined) item.adminCurrency = adminCurrency;
                        if (deliveryRate !== undefined) item.deliveryRate = deliveryRate;
                        item.adminComment = adminComment || ""; 
                        changed = true;
                    } else {
                        if (item.rank === 'ЛИДЕР') {
                            item.rank = 'РЕЗЕРВ';
                            changed = true;
                        }
                        if (adminComment !== undefined) {
                            item.adminComment = adminComment;
                            changed = true;
                        }
                    }
                }
            }
            return item;
        });

        if (changed) {
            sheet.getRange(i + 1, 11).setValue(JSON.stringify(items));
            sheet.getRange(i + 1, 12).setValue(generateOfferSummary(items));
        }
    }
  }
  
  const currentItems = JSON.parse(findOrderRowById(sheet, parentId)[10]);
  recalculateSummaryOrReceipt(sheet, parentId, currentItems);
}

function formatAdminAnnulmentMessage(orderId, row, reason) {
  const clientName = row[8];
  let carStr = "Не указано";
  let itemsHtml = "";
  let b24Id = null;
  let leadTitle = clientName;

  try {
      const json = JSON.parse(row[10]);
      const car = json[0]?.car;
      b24Id = json[0]?.bitrixId;
      carStr = getExtendedCarTitle(car, ""); 
      leadTitle = getExtendedCarTitle(car, clientName);
      
      if (json && json.length > 0) {
          json.forEach(i => {
              itemsHtml += `• ${i.AdminName || i.name} (${i.AdminQuantity || i.quantity} шт)\n`;
          });
      }
  } catch(e) {}

  let msg = `❌ <b>ЗАКАЗ ${orderId} был аннулирован</b>\n`;
  msg += `Заказ: <code>${orderId}</code>\n\n`;
  msg += `🚘 <b>Машина:</b> ${carStr}\n`;
  msg += `👤 <b>Клиент:</b> ${clientName}\n`;
  msg += `🔢 <b>VIN:</b> <code>${row[7]}</code>\n\n`;
  msg += `📋 <b>ПОЗИЦИИ:</b>\n`;
  if (itemsHtml) msg += itemsHtml;
  else msg += `(Нет данных)\n`;
  msg += `\n❗ <b>Причина:</b> ${reason || "Не указана"}\n`;
  
  if (b24Id) msg += `\n🔗 <a href="${B24_BASE_URL}/crm/lead/details/${b24Id}/">${leadTitle}</a>`;
  return msg;
}

function formatRefusalMessage(orderId, row, allOffers) {
  const clientName = row[8];
  let carStr = "Не указано";
  let itemsHtml = "";
  let b24Id = null;
  let totalSum = 0;
  let leadTitle = clientName;

  try {
      const json = JSON.parse(row[10]);
      const car = json[0]?.car;
      b24Id = json[0]?.bitrixId;
      carStr = getCarHeader(car);
      leadTitle = getExtendedCarTitle(car, clientName);
      
      const receiptText = String(row[11] || '');
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
  msg += `🔢 <b>VIN:</b> <code>${row[7]}</code>\n\n`;
  msg += `📋 <b>ПОЗИЦИИ (Утверждено):</b>\n`;
  if (itemsHtml) msg += itemsHtml;
  else msg += `(Нет позиций)\n`;
  msg += `\n💰 <b>ИТОГО: ${totalSum.toLocaleString()} руб.</b>\n`;
  
  if (b24Id) msg += `\n🔗 <a href="${B24_BASE_URL}/crm/lead/details/${b24Id}/">${leadTitle}</a>`;
  return msg;
}

function getAllOffersForOrder(sheet, orderId) {
    const data = sheet.getDataRange().getValues();
    const offers = [];
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][1]) === String(orderId) && data[i][2] === 'OFFER') {
            try {
                const items = JSON.parse(data[i][10]);
                offers.push({ items });
            } catch(e) {}
        }
    }
    return offers;
}

function formatCPMessage(orderId, row) {
  let carStr = "Авто не указано";
  let bitrixId = null;
  let itemsHtml = "";
  let clientName = row[8];
  let leadTitle = clientName;
  let totalSum = 0;
  let currency = 'RUB';
  
  try {
      const json = JSON.parse(row[10]);
      const car = json[0]?.car;
      bitrixId = json[0]?.bitrixId;
      carStr = getCarHeader(car);
      leadTitle = getExtendedCarTitle(car, clientName);
      
      const allOffers = getAllOffersForOrder(SpreadsheetApp.getActiveSpreadsheet().getSheetByName('MarketData'), orderId);
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
  msg += `🔢 <b>VIN:</b> <code>${row[7]}</code>\n\n`;
  msg += `📋 <b>ПОЗИЦИИ (Утверждено):</b>\n`;
  if (itemsHtml) {
      msg += itemsHtml;
      msg += `\n💰 <b>ИТОГО: ${totalSum.toLocaleString()} ${curSymbol}</b>\n`;
  } else msg += `(Нет позиций)\n`;

  if (bitrixId) msg += `\n🔗 <a href="${B24_BASE_URL}/crm/lead/details/${bitrixId}/">${leadTitle}</a>`;
  return msg;
}

function formatPurchaseConfirmationMessage(orderId, row) {
  let carStr = "Авто не указано";
  let bitrixId = null;
  let itemsHtml = "";
  let totalSum = 0;
  let clientName = row[8];
  let leadTitle = clientName;
  
  try {
      const json = JSON.parse(row[10]);
      const car = json[0]?.car;
      bitrixId = json[0]?.bitrixId;
      carStr = getCarHeader(car);
      leadTitle = getExtendedCarTitle(car, clientName);
      
      const receiptText = String(row[11] || '');
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
  } catch(e) {}

  let msg = `🛍 <b>КЛИЕНТ ГОТОВ КУПИТЬ</b>\n`;
  msg += `Заказ: <code>${orderId}</code>\n\n`;
  msg += `🚘 <b>Машина:</b> ${carStr}\n`;
  msg += `👤 <b>Клиент:</b> ${clientName}\n\n`;
  msg += `📋 <b>ПОЗИЦИИ:</b>\n`;
  msg += itemsHtml;
  msg += `\n💰 <b>ИТОГО: ${totalSum.toLocaleString()} руб.</b>\n`;

  if (bitrixId) msg += `\n🔗 <a href="${B24_BASE_URL}/crm/lead/details/${bitrixId}/">${leadTitle}</a>\nСконвертируйте в сделку!`;
  return msg;
}

function formatNewOfferMessage(offer, offerNum, parentRow) {
    let carStr = "Авто не найдено";
    let clientName = "Неизвестно";
    let vin = offer.vin;
    let bitrixId = null;
    let itemsHtml = "";
    let leadTitle = "CRM Lead";
    let totalSum = 0;
    let currency = 'RUB';
    let sellerPhone = "Не указан";
    
    if (parentRow) {
        try {
            clientName = parentRow[8];
            const json = JSON.parse(parentRow[10]);
            const car = json[0]?.car;
            bitrixId = json[0]?.bitrixId;
            carStr = getCarHeader(car);
            leadTitle = getExtendedCarTitle(car, clientName);
        } catch(e) {}
    }

    if (offer.items) {
        if (offer.items[0] && offer.items[0].sellerPhone) sellerPhone = offer.items[0].sellerPhone;
        offer.items.forEach(item => {
            if ((item.offeredQuantity || 0) > 0) {
                const price = item.sellerPrice || 0;
                const cur = (item.sellerCurrency === 'USD') ? '$' : (item.sellerCurrency === 'CNY' ? '¥' : '₽');
                const qty = item.offeredQuantity || 1;
                const weight = item.weight ? ` | ⚖️ ${item.weight}кг` : "";
                const term = item.deliveryWeeks ? ` | 📅 ${item.deliveryWeeks}н` : "";
                itemsHtml += `• ${item.name} — <b>${price}${cur}</b> x <b>${qty}шт</b>${weight}${term}\n`;
                totalSum += price * qty;
            }
        });
    }

    let msg = `💰 <b>НОВОЕ ПРЕДЛОЖЕНИЕ (№${offerNum})</b>\n`;
    msg += `К заказу: <code>${offer.parentId}</code>\n`;
    msg += `Поставщик: <b>${offer.clientName}</b>\n`;
    msg += `📞 Тел: <code>${sellerPhone}</code>\n\n`;
    msg += `🚘 <b>Машина:</b> ${carStr}\n`;
    msg += `👤 <b>Клиент:</b> ${clientName}\n`;
    msg += `🔢 <b>VIN:</b> <code>${vin}</code>\n\n`;
    if (itemsHtml) {
        msg += `📋 <b>ПОЗИЦИИ:</b>\n${itemsHtml}\n`;
        msg += `💰 <b>ИТОГО: ${totalSum.toLocaleString()}</b>\n`;
    }
    if (bitrixId) msg += `\n🔗 <a href="${B24_BASE_URL}/crm/lead/details/${bitrixId}/">${leadTitle}</a>`;
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
  if (order.items) order.items.forEach(i => msg += `• ${i.name} — ${i.quantity} шт\n`);
  if (b24Result && b24Result.id) msg += `\n🔗 <a href="${B24_BASE_URL}/crm/lead/details/${b24Result.id}/">${leadTitle}</a>`;
  return msg;
}

function addLeadWithTg(order) {
  var carModel = "Авто не указано";
  if (order.items && order.items.length > 0 && order.items[0].car) carModel = order.items[0].car.model || "Модель?"; 
  var leadTitleText = carModel + " | " + (order.clientName || "Клиент");
  var rawTitle = leadTitleText + " | " + (order.vin || "Без VIN");
  var leadTitleEnc = encodeURIComponent(rawTitle);
  var clientName = encodeURIComponent(order.clientName || "Неизвестный");
  var comments = encodeURIComponent("Заказ: " + order.id + "\nVIN: " + (order.vin || "-") + "\nЛокация: " + (order.location || "-"));

  var options = { "method": "get", "validateHttpsCertificates": false, "muteHttpExceptions": true };
  try {
    var leadUrl = B24_WEBHOOK_URL + "crm.lead.add?fields[TITLE]=${leadTitleEnc}&fields[NAME]=${clientName}&fields[COMMENTS]=${comments}&fields[STATUS_ID]=NEW&fields[OPENED]=Y"; 
    var leadResponse = UrlFetchApp.fetch(leadUrl, options);
    var leadJson = JSON.parse(leadResponse.getContentText());
    if (!leadJson.result) return { error: leadJson.error_description || "Ошибка Б24" };
    var newLeadId = leadJson.result;

    if (order.items && order.items.length > 0) {
      var productParams = "?id=" + newLeadId;
      for (var i = 0; i < order.items.length; i++) {
        var item = order.items[i];
        productParams += "&rows[" + i + "][PRODUCT_NAME]="+ encodeURIComponent(item.name) + "&rows[" + i + "][PRICE]=0&rows[" + i + "][QUANTITY]=" + (item.quantity || 1) + "&rows[" + i + "][CURRENCY_ID]=RUB&rows[" + i + "][PRODUCT_ID]=0";
      }
      UrlFetchApp.fetch(B24_WEBHOOK_URL + "crm.lead.productrows.set" + productParams, options);
    }
    return { id: newLeadId, title: leadTitleText }; 
  } catch (e) { return { error: e.toString() }; }
}

function countOffersForOrder(sheet, parentId) {
  const data = sheet.getDataRange().getValues();
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(parentId) && data[i][2] === 'OFFER') count++;
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

function generateOrderSummary(items) {
    let car = items[0]?.car;
    let header = getCarHeader(car);
    const lines = items.map(i => `⬜ | ${i.AdminName || i.name} | ${i.quantity} шт`);
    return `${header}\n${lines.join('\n')}`;
}

function generateOfferSummary(items) {
    return items.map(i => `${i.rank === 'ЛИДЕР' ? '✅' : '⬜'} | ${i.name} | ${i.quantity} шт`).join('\n');
}

function findOrderRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) { if (String(data[i][0]) === String(id)) return data[i]; }
  return null;
}

function updateStatusById(sheet, id, colIndex, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) { if (String(data[i][0]) === String(id)) sheet.getRange(i + 1, colIndex).setValue(value); }
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

function getOrCreateSheet(doc, name, headers) {
  let s = doc.getSheetByName(name);
  if (!s) { s = doc.insertSheet(name); s.appendRow(headers); s.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e5e7eb"); s.setFrozenRows(1); }
  return s;
}

function formatSheetStyles(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  sheet.setColumnWidth(10, 300);
  sheet.getRange(2, 10, lastRow-1, 1).setWrap(true);
}

function formatRows(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;
  for (let i = 1; i < data.length; i++) {
    const rowIdx = i + 1;
    const type = data[i][2];
    const refusal = data[i][14]; 
    const range = sheet.getRange(rowIdx, 1, 1, 15);
    if (refusal === 'Y') {
        range.setBackground('#ffebee').setFontColor('#b71c1c');
    } else if (type === 'OFFER') {
        range.setBackground('#fffde7');
    } else {
        range.setBackground(null).setFontColor(null);
    }
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
function getNextId(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;
  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let max = 0;
  for (let i = 0; i < data.length; i++) {
    const val = parseInt(data[i][0]);
    if (!isNaN(val) && val > max) max = val;
  }
  return max + 1;
}

function closeOrderInSheet(sheet, orderId) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) { if (String(data[i][0]) === String(orderId) || String(data[i][1]) === String(orderId)) { 
    sheet.getRange(i + 1, 4).setValue('ЗАКРЫТ');
    sheet.getRange(i + 1, 5).setValue('ЗАКРЫТ');
    sheet.getRange(i + 1, 6).setValue('ЗАКРЫТ');
    sheet.getRange(i + 1, 7).setValue('ЗАКРЫТ');
  } }
}