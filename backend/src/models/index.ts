import { sequelize } from '../configs/database.config';

import { User } from './User.model';
import { Travel } from './Travel.model';
import { Recipient } from './Recipient.model';
import { Package } from './Package.model';
import { Payment } from './Payment.model';
import { Notification } from './Notification.model';
import { ForumMessage, UserForumMessage } from './ForumMessage.model';
import { MessageRead } from './MessageRead.model';
import { Country } from './Country.model';
import { Report } from './Report.model';
import { Currency } from './Currency.model';
import { PlatformConfig } from './PlatformConfig.model';
import { PayoutAccount } from './PayoutAccount.model';
import { Payout } from './Payout.model';

User.initModel(sequelize);
Travel.initModel(sequelize);
Recipient.initModel(sequelize);
Package.initModel(sequelize);
Payment.initModel(sequelize);
Notification.initModel(sequelize);
ForumMessage.initModel(sequelize);
UserForumMessage.initModel(sequelize);
MessageRead.initModel(sequelize);
Country.initModel(sequelize);
Report.initModel(sequelize);
Currency.initModel(sequelize);
PlatformConfig.initModel(sequelize);
PayoutAccount.initModel(sequelize);
Payout.initModel(sequelize);

// User -> Report
User.hasMany(Report, { foreignKey: 'reporter_id', as: 'reports_filed' });
Report.belongsTo(User, { foreignKey: 'reporter_id', as: 'reporter' });

// User -> Package
User.hasMany(Package, { foreignKey: 'client_id', as: 'packages' });
Package.belongsTo(User, { foreignKey: 'client_id', as: 'client' });

// User -> Travel (un groupeur/admin crée des voyages)
User.hasMany(Travel, { foreignKey: 'created_by', as: 'travels' });
Travel.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Country -> Travel (pays d'origine / destination)
Travel.belongsTo(Country, { foreignKey: 'origin_country_id',      as: 'origin' });
Travel.belongsTo(Country, { foreignKey: 'destination_country_id', as: 'destination' });
Country.hasMany(Travel,   { foreignKey: 'origin_country_id',      as: 'origin_travels' });
Country.hasMany(Travel,   { foreignKey: 'destination_country_id', as: 'destination_travels' });

// Travel -> Package
Travel.hasMany(Package, { foreignKey: 'travel_id', as: 'packages' });
Package.belongsTo(Travel, { foreignKey: 'travel_id', as: 'travel' });

// User -> Recipient
User.hasMany(Recipient, { foreignKey: 'client_id', as: 'recipients' });
Recipient.belongsTo(User, { foreignKey: 'client_id', as: 'client' });

// Recipient -> Package
Recipient.hasMany(Package, { foreignKey: 'recipient_id', as: 'packages' });
Package.belongsTo(Recipient, { foreignKey: 'recipient_id', as: 'recipient' });

// User -> Payment (client)
User.hasMany(Payment, { foreignKey: 'client_id', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'client_id', as: 'client' });

// User -> Payment (groupeur)
User.hasMany(Payment, { foreignKey: 'groupeur_id', as: 'received_payments' });
Payment.belongsTo(User, { foreignKey: 'groupeur_id', as: 'groupeur' });

// Package -> Payment (1:1 — one active payment per package)
Package.hasOne(Payment, { foreignKey: 'package_id', as: 'payment' });
Payment.belongsTo(Package, { foreignKey: 'package_id', as: 'package' });

// Travel -> Payment
Travel.hasMany(Payment, { foreignKey: 'travel_id', as: 'payments' });
Payment.belongsTo(Travel, { foreignKey: 'travel_id', as: 'travel' });

// User -> Notification
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Travel -> ForumMessage
Travel.hasMany(ForumMessage, { foreignKey: 'travel_id', as: 'forum_messages' });
ForumMessage.belongsTo(Travel, { foreignKey: 'travel_id', as: 'travel' });

// User -> ForumMessage (auteur)
User.hasMany(ForumMessage, { foreignKey: 'author_id', as: 'authored_messages' });
ForumMessage.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

// ForumMessage self-reference (replies)
ForumMessage.hasMany(ForumMessage, { foreignKey: 'parent_message_id', as: 'replies' });
ForumMessage.belongsTo(ForumMessage, { foreignKey: 'parent_message_id', as: 'parent' });

// MessageRead (accusés de lecture)
ForumMessage.hasMany(MessageRead, { foreignKey: 'message_id', as: 'reads' });
MessageRead.belongsTo(ForumMessage, { foreignKey: 'message_id', as: 'message' });
User.hasMany(MessageRead, { foreignKey: 'user_id', as: 'message_reads' });
MessageRead.belongsTo(User, { foreignKey: 'user_id', as: 'reader' });

// User ↔ ForumMessage (N:M)
User.belongsToMany(ForumMessage, { through: UserForumMessage, foreignKey: 'user_id', as: 'read_messages' });
ForumMessage.belongsToMany(User, { through: UserForumMessage, foreignKey: 'message_id', as: 'readers' });

// User -> PayoutAccount (groupeur peut avoir plusieurs comptes de reversement)
User.hasMany(PayoutAccount, { foreignKey: 'user_id', as: 'payout_accounts' });
PayoutAccount.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Travel -> Payout (un reversement par voyage à la livraison)
Travel.hasOne(Payout, { foreignKey: 'travel_id', as: 'payout' });
Payout.belongsTo(Travel, { foreignKey: 'travel_id', as: 'travel' });

// User -> Payout (groupeur)
User.hasMany(Payout, { foreignKey: 'groupeur_id', as: 'payouts' });
Payout.belongsTo(User, { foreignKey: 'groupeur_id', as: 'groupeur' });

// PayoutAccount -> Payout
PayoutAccount.hasMany(Payout, { foreignKey: 'payout_account_id', as: 'payouts' });
Payout.belongsTo(PayoutAccount, { foreignKey: 'payout_account_id', as: 'payout_account' });

export {
  User, Travel, Recipient, Package, Payment, Notification,
  ForumMessage, UserForumMessage, MessageRead, Country, Report,
  Currency, PlatformConfig, PayoutAccount, Payout,
};
export * from './User.model';
export * from './Travel.model';
export * from './Recipient.model';
export * from './Package.model';
export * from './Payment.model';
export * from './Notification.model';
export * from './ForumMessage.model';
export * from './Country.model';
export * from './Report.model';
export * from './Currency.model';
export * from './PlatformConfig.model';
export * from './PayoutAccount.model';
export * from './Payout.model';
