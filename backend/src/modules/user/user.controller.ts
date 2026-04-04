import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Response, NextFunction } from 'express';
import { User, UserRole } from '../../models/User.model';
import { Travel } from '../../models/Travel.model';
import { AppError } from '../../middlewares/errorHandler';
import { sendVerificationEmail } from '../../services/email.service';
import type { AuthRequest } from '../../middlewares/authenticate';

// Profil public d'un groupeur

export async function getPublicProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params.id);
    const user = await User.findByPk(userId, {
      attributes: [
        'user_id', 'first_name', 'last_name', 'phone', 'email',
        'city', 'country', 'registration_date',
        'profile_picture', 'phone_verified', 'email_verified', 'role',
      ],
    });

    if (!user) throw new AppError(404, 'Utilisateur introuvable');
    if (user.role === UserRole.CLIENT) throw new AppError(403, 'Profil non disponible pour les clients');

    const travel_count = await Travel.count({ where: { created_by: userId } });

    res.json({
      user_id:           user.user_id,
      first_name:        user.first_name,
      last_name:         user.last_name,
      phone:             user.phone,
      email:             user.email,
      city:              user.city,
      country:           user.country,
      registration_date: user.registration_date,
      profile_picture:   user.profile_picture,
      phone_verified:    user.phone_verified,
      email_verified:    user.email_verified,
      travel_count,
    });
  } catch (error) {
    next(error);
  }
}

// Upload photo de profil

export async function uploadAvatar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) throw new AppError(400, 'Aucun fichier fourni');

    const user = await User.findByPk(req.user!.user_id);
    if (!user) throw new AppError(404, 'Utilisateur introuvable');

    // Supprimer l'ancienne photo si elle existe
    if (user.profile_picture) {
      const oldPath = path.join(process.cwd(), user.profile_picture.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const picturePath = `/uploads/avatars/${file.filename}`;
    await user.update({ profile_picture: picturePath });

    res.json({ profile_picture: picturePath });
  } catch (error) {
    next(error);
  }
}

// Supprimer photo de profil

export async function deleteAvatar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findByPk(req.user!.user_id);
    if (!user) throw new AppError(404, 'Utilisateur introuvable');

    if (user.profile_picture) {
      const filePath = path.join(process.cwd(), user.profile_picture.replace(/^\//, ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await user.update({ profile_picture: null });
    res.json({ profile_picture: null });
  } catch (error) {
    next(error);
  }
}

// Envoyer l'email de vérification

export async function sendEmailVerification(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findByPk(req.user!.user_id);
    if (!user) throw new AppError(404, 'Utilisateur introuvable');
    if (user.email_verified) throw new AppError(400, 'Email déjà vérifié');

    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await user.update({ email_verification_token: token, email_verification_expires: expires });
    await sendVerificationEmail(user.email, user.first_name, token);

    res.json({ message: 'Email de vérification envoyé.' });
  } catch (error) {
    next(error);
  }
}

// Confirmer la vérification email (lien cliqué)

export async function confirmEmailVerification(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.query as { token?: string };
    if (!token) throw new AppError(400, 'Token manquant');

    const user = await User.findOne({ where: { email_verification_token: token } });
    if (!user) throw new AppError(400, 'Lien invalide ou expiré');
    if (user.email_verified) {
      res.json({ message: 'Email déjà vérifié.' });
      return;
    }
    if (!user.email_verification_expires || user.email_verification_expires < new Date()) {
      throw new AppError(400, 'Lien expiré. Veuillez en demander un nouveau.');
    }

    await user.update({
      email_verified:            true,
      email_verification_token:  null,
      email_verification_expires: null,
    });

    res.json({ message: 'Email vérifié avec succès.' });
  } catch (error) {
    next(error);
  }
}
