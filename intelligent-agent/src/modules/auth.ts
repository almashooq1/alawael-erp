// وحدة المصادقة (Authentication)
export class Auth {
  authenticate(token: string): boolean {
    // تحقق رمزي (مكان للتطوير لاحقًا)
    return token === 'valid-token';
  }
}
