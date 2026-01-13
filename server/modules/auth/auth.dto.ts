import { z } from "zod";


export const RegisterDto = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const LoginDto = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export interface AuthUserResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt?: Date;
}

export type LoginDto = z.infer<typeof LoginDto>;
export type RegisterDto = z.infer<typeof RegisterDto>;