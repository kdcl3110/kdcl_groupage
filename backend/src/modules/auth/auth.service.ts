import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Op } from "sequelize";
import { isValidPhoneNumber } from "libphonenumber-js";

import { User, UserRole, UserStatus } from "../../models/User.model";
import { env } from "../../configs/env.config";
import { AppError } from "../../middlewares/errorHandler";
import { sendPasswordResetEmail } from "../../services/email.service";
import type {
  RegisterDto,
  LoginDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from "./auth.dto";

type SafeUser = Omit<
  UserAttributes,
  | "password"
  | "reset_password_token"
  | "reset_password_expires"
  | "email_verification_token"
  | "email_verification_expires"
>;

import type { UserAttributes } from "../../models/User.model";

const SALT_ROUNDS = 12;
const RESET_TOKEN_EXPIRES_MS = 15 * 60 * 1000; // 15 minutes

export class AuthService {
  async register(
    data: RegisterDto,
  ): Promise<{ token: string; user: SafeUser }> {
    this.validateRegisterInput(data);

    const existing = await User.findOne({ where: { email: data.email } });
    if (existing) throw new AppError(409, "Email already in use");

    const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);

    const role = data.role
      ? data.role === "admin"
        ? UserRole.ADMIN
        : data.role === "freight_forwarder"
          ? UserRole.FREIGHT_FORWARDER
          : UserRole.CLIENT
      : UserRole.CLIENT;

    const user = await User.create({ ...data, password: hashed, role });

    return { token: this.signToken(user.user_id), user: this.sanitize(user) };
  }

  async login(data: LoginDto): Promise<{ token: string; user: SafeUser }> {
    if (!data.email || !data.password) {
      throw new AppError(400, "Email and password are required");
    }

    const user = await User.findOne({ where: { email: data.email } });
    if (!user) throw new AppError(401, "Invalid credentials");

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) throw new AppError(401, "Invalid credentials");

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError(403, "Account is suspended or inactive");
    }

    return { token: this.signToken(user.user_id), user: this.sanitize(user) };
  }

  async forgotPassword(
    email: string,
  ): Promise<{ message: string; reset_token?: string }> {
    if (!email) throw new AppError(400, "Email is required");

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return { message: "If this email exists, a reset link has been sent" };
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await user.update({
      reset_password_token: hashedToken,
      reset_password_expires: new Date(Date.now() + RESET_TOKEN_EXPIRES_MS),
    });

    // Send reset email (non-blocking — don't expose send failures to the caller)
    sendPasswordResetEmail(user.email, user.first_name, rawToken).catch((err) =>
      console.error('[auth] Failed to send password reset email:', err),
    );

    return {
      message: "If this email exists, a reset link has been sent",
      // Expose token only in development for testing
      ...(env.isDev() && { reset_token: rawToken }),
    };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    if (!token || !newPassword) {
      throw new AppError(400, "Token and new password are required");
    }
    this.validatePasswordStrength(newPassword);

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      where: {
        reset_password_token: hashedToken,
        reset_password_expires: { [Op.gt]: new Date() },
      },
    });

    if (!user) throw new AppError(400, "Invalid or expired reset token");

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.update({
      password: hashed,
      reset_password_token: null,
      reset_password_expires: null,
    });

    return { message: "Password reset successfully" };
  }

  async updateProfile(
    userId: number,
    data: UpdateProfileDto,
  ): Promise<SafeUser> {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError(404, "User not found");

    if (data.phone && !isValidPhoneNumber(data.phone)) {
      throw new AppError(400, "Invalid phone number format");
    }

    const patch: Record<string, unknown> = { ...data };

    // Changement d'email : vérifier la disponibilité et réinitialiser la vérification
    if (data.email && data.email !== user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new AppError(400, "Invalid email format");
      }
      const existing = await User.findOne({ where: { email: data.email } });
      if (existing) throw new AppError(409, "Cette adresse email est déjà utilisée");
      patch.email_verified            = false;
      patch.email_verification_token  = null;
      patch.email_verification_expires = null;
    }

    await user.update(patch);
    return this.sanitize(user);
  }

  async changePassword(
    userId: number,
    data: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError(404, "User not found");

    const valid = await bcrypt.compare(data.current_password, user.password);
    if (!valid) throw new AppError(401, "Current password is incorrect");

    this.validatePasswordStrength(data.new_password);

    const hashed = await bcrypt.hash(data.new_password, SALT_ROUNDS);
    await user.update({ password: hashed });

    return { message: "Password changed successfully" };
  }

  private signToken(userId: number): string {
    return jwt.sign({ user_id: userId }, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn as any,
    });
  }

  private sanitize(user: User): SafeUser {
    const {
      password,
      reset_password_token,
      reset_password_expires,
      email_verification_token,
      email_verification_expires,
      ...safe
    } = user.toJSON() as UserAttributes;
    return safe;
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 6) {
      throw new AppError(400, "Password must be at least 6 characters long");
    }
  }

  private validateRegisterInput(data: RegisterDto): void {
    const required: (keyof RegisterDto)[] = [
      "first_name",
      "last_name",
      "email",
      "password",
      "phone",
      "street",
      "city",
      "country",
    ];
    for (const field of required) {
      if (!data[field]) throw new AppError(400, `Field "${field}" is required`);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new AppError(400, "Invalid email format");
    }

    if (data.phone && !isValidPhoneNumber(data.phone)) {
      throw new AppError(400, "Invalid phone number format");
    }

    this.validatePasswordStrength(data.password);
  }
}
