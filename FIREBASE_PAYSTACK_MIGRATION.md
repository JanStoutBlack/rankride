# Firebase backend status

Firebase is now the active application backend. Authentication, Firestore, realtime listeners, security rules, indexes, callable functions, and admin analytics live in this repository. The former Supabase source remains only as historical migration material and is not imported by the running application.

Before production launch, deploy the rules, indexes, and functions; import existing records; assign the first `superadmin` custom claim with a trusted Admin SDK environment; enable Email/Password Authentication; and run role-by-role emulator tests. Paystack remains future work and must be implemented only in Cloud Functions with secret-managed credentials and verified, idempotent webhooks.
