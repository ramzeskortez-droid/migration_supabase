import { supabase } from '../lib/supabaseClient';
import * as ratesApi from './api/finance/rates';
import * as settingsApi from './api/finance/settings';
import * as uploadApi from './api/storage/upload';
import * as brandsReadApi from './api/brands/read';
import * as brandsWriteApi from './api/brands/write';
import * as loginApi from './api/auth/login';
import * as registrationApi from './api/auth/registration';
import * as usersApi from './api/auth/users';
import * as buyerDashboardApi from './api/buyer/dashboard';
import * as buyerLabelsApi from './api/buyer/labels';
import * as buyerUtilsApi from './api/buyer/utils';
import * as chatCoreApi from './api/chat/core';
import * as chatRealtimeApi from './api/chat/realtime';
import * as chatManagementApi from './api/chat/management';
import * as chatStatsApi from './api/chat/stats';
import * as offersCreateApi from './api/offers/create';
import * as offersEditApi from './api/offers/edit';
import * as offersManageApi from './api/offers/manage';
import * as offersRankingApi from './api/offers/ranking';
import * as ordersFetchApi from './api/orders/fetch';
import * as ordersDetailsApi from './api/orders/details';
import * as ordersCreationApi from './api/orders/creation';
import * as ordersUpdateApi from './api/orders/update';
import * as ordersWorkflowApi from './api/orders/workflow';
import * as ordersDebugApi from './api/orders/debug';
import * as ordersStatsApi from './api/orders/stats';
import * as emailArchiveApi from './api/email/archive';
import * as emailLockingApi from './api/email/locking';
import * as adminChecklistApi from './api/admin/checklist';

export class SupabaseService {
  // --- CHECKLIST ---
  static getChecklist = adminChecklistApi.getChecklist;
  static upsertChecklistItem = adminChecklistApi.upsertChecklistItem;
  static deleteChecklistItem = adminChecklistApi.deleteChecklistItem;
  static resetChecklist = adminChecklistApi.resetChecklist;

  // --- AUTH ---
  static loginWithToken = loginApi.loginWithToken;
  static generateInviteCode = registrationApi.generateInviteCode;
  static getActiveInvites = registrationApi.getActiveInvites;
  static registerUser = registrationApi.registerUser;
  static getAppUsers = usersApi.getAppUsers;
  static updateUserStatus = usersApi.updateUserStatus;

  // --- FINANCE ---
  static getExchangeRates = ratesApi.getExchangeRates;
  static upsertExchangeRates = ratesApi.upsertExchangeRates;
  static getSystemSettings = settingsApi.getSystemSettings;
  static updateSystemSettings = settingsApi.updateSystemSettings;

  // --- EMAIL ---
  static archiveEmail = emailArchiveApi.archiveEmail;
  static lockEmail = emailLockingApi.lockEmail;
  static unlockEmail = emailLockingApi.unlockEmail;

  // --- STORAGE ---
  static uploadFile = uploadApi.uploadFile;

  // --- BRANDS ---
  static getSellerBrands = brandsReadApi.getSellerBrands;
  static searchBrands = brandsReadApi.searchBrands;
  static checkBrandExists = brandsReadApi.checkBrandExists;
  static getBrandsList = brandsReadApi.getBrandsList;
  static getBrandsFull = brandsReadApi.getBrandsFull;
  static getOfficialBrands = brandsReadApi.getOfficialBrands;
  static getSupplierUsedBrands = brandsReadApi.getSupplierUsedBrands;
  static addBrand = brandsWriteApi.addBrand;
  static updateBrand = brandsWriteApi.updateBrand;
  static deleteBrand = brandsWriteApi.deleteBrand;

  // --- BUYER ---
  static toggleOrderLabel = buyerLabelsApi.toggleOrderLabel;
  static getBuyerLabels = buyerLabelsApi.getBuyerLabels;
  static getBuyerDashboardStats = buyerDashboardApi.getBuyerDashboardStats;
  static getBuyerTabCounts = buyerDashboardApi.getBuyerTabCounts;
  static getBuyerQuickBrands = buyerUtilsApi.getBuyerQuickBrands;

  // --- CHAT ---
  static subscribeToUserChats = chatRealtimeApi.subscribeToUserChats;
  static subscribeToChatMessages = chatRealtimeApi.subscribeToChatMessages;
  static unsubscribeFromChat = chatRealtimeApi.unsubscribeFromChat;
  static getChatMessages = chatCoreApi.getChatMessages;
  static sendChatMessage = chatCoreApi.sendChatMessage;
  static getUnreadChatCount = chatStatsApi.getUnreadChatCount;
  static getOperatorUnreadCount = chatStatsApi.getOperatorUnreadCount; // NEW
  static getUnreadChatCountForSupplier = chatStatsApi.getUnreadChatCountForSupplier;
  static markChatAsRead = chatManagementApi.markChatAsRead;
  static deleteChatHistory = chatManagementApi.deleteChatHistory;
  static getGlobalChatThreads = chatManagementApi.getGlobalChatThreads;
  static archiveChat = chatManagementApi.archiveChat;

  // --- OFFERS ---
  static createOffer = offersCreateApi.createOffer;
  static editOffer = offersEditApi.editOffer;
  static updateOfferItem = offersManageApi.updateOfferItem;
  static lockOffer = offersManageApi.lockOffer;
  static unlockOffer = offersManageApi.unlockOffer;
  static generateTestOffers = offersManageApi.generateTestOffers;
  static updateRank = offersRankingApi.updateRank;

  // --- ORDERS ---
  static getOrders = ordersFetchApi.getOrders;
  static getOrderDetails = ordersDetailsApi.getOrderDetails;
  static getOrderStatus = ordersDetailsApi.getOrderStatus;
  static getOrderItemsSimple = ordersDetailsApi.getOrderItemsSimple;
  static getStatusCounts = ordersDetailsApi.getStatusCounts;
  static getOperatorStatusCounts = ordersStatsApi.getOperatorStatusCounts; 
  static createOrder = ordersCreationApi.createOrder;
  static repeatOrder = ordersCreationApi.repeatOrder;
  static updateOrderMetadata = ordersUpdateApi.updateOrderMetadata;
  static updateOrderJson = ordersUpdateApi.updateOrderJson;
  static updateOrderItemPrice = ordersUpdateApi.updateOrderItemPrice;
  static approveOrderFast = ordersWorkflowApi.approveOrderFast;
  static refuseOrder = ordersWorkflowApi.refuseOrder;
  static updateWorkflowStatus = ordersWorkflowApi.updateWorkflowStatus;
  static manualApproveOrder = ordersWorkflowApi.manualApproveOrder; // Добавлено
  static deleteAllOrders = ordersDebugApi.deleteAllOrders;

  // Special case for seedOrders to keep dependencies
  static async seedOrders(count: number, onProgress?: (current: number) => void, ownerToken: string = 'op1'): Promise<void> {
      const brands = await this.getBrandsList();
      let ownerId: string | undefined;
      const { data: user } = await supabase.from('app_users').select('id').eq('token', ownerToken).maybeSingle();
      if (user) ownerId = user.id;
      else {
          const { data: anyOp } = await supabase.from('app_users').select('id').eq('role', 'operator').limit(1).maybeSingle();
          ownerId = anyOp?.id;
      }
      if (!ownerId) return;
      return ordersDebugApi.seedOrders(count, brands, ownerId, onProgress);
  }
}