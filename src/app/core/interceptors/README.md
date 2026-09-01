# Interceptors

Os interceptors de autenticação ficam em `core/http`: credenciais de sessão,
CSRF e redirecionamento após expiração de sessão. O `ApiErrorService` traduz
respostas `ProblemDetail` em mensagens seguras para a interface.
