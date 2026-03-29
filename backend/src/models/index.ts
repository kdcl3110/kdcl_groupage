import { sequelize } from '../configs/database.config';

import { User } from './User.model';
import { Travel } from './Travel.model';
import { Recipient } from './Recipient.model';
import { Package } from './Package.model';
import { Payment } from './Payment.model';
import { Notification } from './Notification.model';
import { ForumMessage, UserForumMessage } from './ForumMessage.model';

User.initModel(sequelize);
Travel.initModel(sequelize);
Recipient.initModel(sequelize);
Package.initModel(sequelize);
Payment.initModel(sequelize);
Notification.initModel(sequelize);
ForumMessage.initModel(sequelize);
UserForumMessage.initModel(sequelize);

// User -> Package
User.hasMany(Package, { foreignKey: 'client_id', as: 'packages' });
Package.belongsTo(User, { foreignKey: 'client_id', as: 'client' });

// User -> Travel (un groupeur/admin crée des voyages)
User.hasMany(Travel, { foreignKey: 'created_by', as: 'travels' });
Travel.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Travel -> Package
Travel.hasMany(Package, { foreignKey: 'travel_id', as: 'packages' });
Package.belongsTo(Travel, { foreignKey: 'travel_id', as: 'travel' });

// User -> Recipient
User.hasMany(Recipient, { foreignKey: 'client_id', as: 'recipients' });
Recipient.belongsTo(User, { foreignKey: 'client_id', as: 'client' });

// Recipient -> Package
Recipient.hasMany(Package, { foreignKey: 'recipient_id', as: 'packages' });
Package.belongsTo(Recipient, { foreignKey: 'recipient_id', as: 'recipient' });

// User -> Payment
User.hasMany(Payment, { foreignKey: 'client_id', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'client_id', as: 'client' });

// Package -> Payment
Package.hasOne(Payment, { foreignKey: 'package_id', as: 'payment' });
Payment.belongsTo(Package, { foreignKey: 'package_id', as: 'package' });

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

// User ↔ ForumMessage (N:M)
User.belongsToMany(ForumMessage, { through: UserForumMessage, foreignKey: 'user_id', as: 'read_messages' });
ForumMessage.belongsToMany(User, { through: UserForumMessage, foreignKey: 'message_id', as: 'readers' });

export { User, Travel, Recipient, Package, Payment, Notification, ForumMessage, UserForumMessage };
export * from './User.model';
export * from './Travel.model';
export * from './Recipient.model';
export * from './Package.model';
export * from './Payment.model';
export * from './Notification.model';
export * from './ForumMessage.model';
