using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Auth
{
    public class AuthService
    {
        private readonly UserRepository _userRepository;
        private readonly Dictionary<string, string> _sessions;

        public AuthService(UserRepository userRepository)
        {
            _userRepository = userRepository;
            _sessions = new Dictionary<string, string>();
        }

        public async Task<string> Login(string email)
        {
            var user = await _userRepository.FindByEmail(email);
            if (user == null)
            {
                return null;
            }
            var token = $"token-{email}";
            _sessions[token] = user;
            return token;
        }

        public async Task Logout(string token)
        {
            _sessions.Remove(token);
            await Task.CompletedTask;
        }
    }
}
