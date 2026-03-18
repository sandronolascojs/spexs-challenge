'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { GalleryVerticalEnd } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { signUp } from '@/lib/auth/auth-client';

const signupSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (values: SignupFormValues) => {
    const { error } = await signUp.email({
      name: `${values.firstName} ${values.lastName}`,
      email: values.email,
      password: values.password,
      callbackURL: '/',
    });

    if (error) {
      toast.error(
        error.message ?? 'Failed to create account. Please try again.',
      );
      return;
    }

    router.replace('/');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GalleryVerticalEnd className="size-5" />
        </div>
        <h1 className="text-xl font-bold">Create an account</h1>
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="underline underline-offset-4 hover:text-primary"
          >
            Sign in
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup>
          <div className="flex gap-3">
            <Field className="flex-1" data-invalid={!!errors.firstName}>
              <FieldLabel htmlFor="firstName">First name</FieldLabel>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                autoComplete="given-name"
                aria-invalid={!!errors.firstName}
                {...register('firstName')}
              />
              <FieldError>{errors.firstName?.message}</FieldError>
            </Field>

            <Field className="flex-1" data-invalid={!!errors.lastName}>
              <FieldLabel htmlFor="lastName">Last name</FieldLabel>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                autoComplete="family-name"
                aria-invalid={!!errors.lastName}
                {...register('lastName')}
              />
              <FieldError>{errors.lastName?.message}</FieldError>
            </Field>
          </div>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            <FieldError>{errors.email?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            <FieldError>{errors.password?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.confirmPassword}>
            <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
            <FieldError>{errors.confirmPassword?.message}</FieldError>
          </Field>

          <FieldSeparator />

          <Field>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Spinner data-icon="inline-start" />}
              Create account
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
