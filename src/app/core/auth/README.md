# Auth

`AuthService` concentra o estado da sessão em Signals e oferece as operações de
login, cadastro, logout e descoberta do usuário atual (`GET /api/auth/me`). A sessão
fica no cookie HTTP gerenciado pelo backend; nenhuma senha ou token é persistido no
frontend.
