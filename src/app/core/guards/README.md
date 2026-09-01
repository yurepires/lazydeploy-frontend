# Guards

`authGuard` protege as páginas privadas e `guestGuard` impede que uma sessão ativa
volte para login ou cadastro. Ambos reutilizam o estado do `AuthService` e aguardam
a primeira descoberta da sessão quando necessário.
