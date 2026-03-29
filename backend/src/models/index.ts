import { sequelize } from '../configs/database.config';

import { User } from './User.model';
import { Groupage } from './Groupage.model';
import { Recipient } from './Recipient.model';
import { Package } from './Package.model';
import { Payment } from './Payment.model';
import { Notification } from './Notification.model';
import { ForumMessage, UserForumMessage } from './ForumMessage.model';

User.initModel(sequelize);
Groupage.initModel(sequelize);
Recipient.initModel(sequelize);
Package.initModel(sequelize);
Payment.initModel(sequelize);
Notification.initModel(sequelize);
ForumMessage.initModel(sequelize);
UserForumMessage.initModel(sequelize);


// User -> Package (a client can have many packages)
User.hasMany(Package, { foreignKey: 'client_id', as: 'packages' });
Package.belongsTo(User, { foreignKey: 'client_id', as: 'client' });

// Groupage -> Package (a groupage contains many packages)
Groupage.hasMany(Package, { foreignKey: 'groupage_id', as: 'packages' });
Package.belongsTo(Groupage, { foreignKey: 'groupage_id', as: 'groupage' });

// User -> Recipient (a client owns many recipients)
User.hasMany(Recipient, { foreignKey: 'client_id', as: 'recipients' });
Recipient.belongsTo(User, { foreignKey: 'client_id', as: 'client' });

// Recipient -> Package (a recipient can receive many packages)
Recipient.hasMany(Package, { foreignKey: 'recipient_id', as: 'packages' });
Package.belongsTo(Recipient, { foreignKey: 'recipient_id', as: 'recipient' });

// User -> Payment
User.hasMany(Payment, { foreignKey: 'client_id', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'client_id', as: 'client' });

// Package -> Payment (one package has one payment)
Package.hasOne(Payment, { foreignKey: 'package_id', as: 'payment' });
Payment.belongsTo(Package, { foreignKey: 'package_id', as: 'package' });

// User -> Notification
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ForumMessage self-reference (replies)
ForumMessage.hasMany(ForumMessage, { foreignKey: 'parent_message_id', as: 'replies' });
ForumMessage.belongsTo(ForumMessage, { foreignKey: 'parent_message_id', as: 'parent' });

// User ↔ ForumMessage (N:M through UserForumMessage)
User.belongsToMany(ForumMessage, {
  through: UserForumMessage,
  foreignKey: 'user_id',
  as: 'forum_messages',
});
ForumMessage.belongsToMany(User, {
  through: UserForumMessage,
  foreignKey: 'message_id',
  as: 'participants',
});

export { User, Groupage, Recipient, Package, Payment, Notification, ForumMessage, UserForumMessage };
export * from './User.model';
export * from './Groupage.model';
export * from './Recipient.model';
export * from './Package.model';
export * from './Payment.model';
export * from './Notification.model';
export * from './ForumMessage.model';
