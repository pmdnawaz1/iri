using System;
using System.Threading.Tasks;

namespace Auth
{
    public class AuthController
    {
        private readonly AuthService _authService;

        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

        public async Task<string> Login(string email)
        {
            return await _authService.Login(email);
        }

        public async Task Logout(string token)
        {
            await _authService.Logout(token);
        }
    }
}
