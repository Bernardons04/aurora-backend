const express = require("express");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");
require("dotenv").config();

// Inicialização do app
const app = express();
app.use(cors());
app.use(express.json());

// =====================================
// CONFIGURAÇÃO MULTER (receber arquivos)
// =====================================
const storage = multer.memoryStorage(); // arquivo fica na memória RAM
const upload = multer({ storage });

// =====================================
// SUPABASE CLIENT (service_role)
// =====================================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);


// =====================================
// MIDDLEWARE DE AUTENTICAÇÃO
// =====================================
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token não fornecido ou mal formatado.' });
    }

    const token = authHeader.split(' ')[1];

    // Valida o token com o Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    // Anexa o usuário ao objeto da requisição para uso posterior
    req.user = user;
    next(); // Tudo certo, pode prosseguir para a rota
};

// =====================================
// ENDPOINT PARA TESTE
// =====================================
app.get("/", (req, res) => {
    res.send("API rodando!");
});

// =====================================
// ENDPOINT EXEMPLO (containers)
// =====================================
let containers = [
    { id: 1, name: "Container A" },
    { id: 2, name: "Container B" }
];

app.get("/containers", (req, res) => {
    res.json(containers);
});

app.get("/containers/:id", (req, res) => {
    const id = Number(req.params.id);
    const container = containers.find(c => c.id === id);
    container ? res.json(container) : res.status(404).json({ error: "Not found" });
});

app.post("/containers", (req, res) => {
    const newContainer = {
        id: containers.length + 1,
        ...req.body
    };
    containers.push(newContainer);
    res.status(201).json(newContainer);
});

// =====================================
// ENDPOINTS DE AUTENTICAÇÃO
// =====================================

// Rota de Cadastro (Signup)
app.post("/signup", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    // Por padrão, Supabase pode exigir confirmação de e-mail.
    // Para desenvolvimento, você pode desativar em: Supabase Dashboard > Authentication > Providers > Email.
    res.status(201).json({ user: data.user, session: data.session });
});

// Rota de Login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return res.status(401).json({ error: error.message }); // 401 Unauthorized
    }

    res.status(200).json({ user: data.user, session: data.session });
});

// =====================================
// ENDPOINT DE UPLOAD DE AVATAR
// =====================================
app.post("/upload-avatar", authMiddleware, upload.single("avatar"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Nenhuma imagem enviada." });
        }

        const userId = req.user.id;
        const file = req.file;
        const fileName = `public/${userId}`;
        // Upload para Supabase
          const { data, error } = await supabase.storage
            .from("avatars") // Nome do seu bucket
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true // Essencial: substitui o arquivo se já existir um com o mesmo nome.
            });

         if (error) {
            console.error("Erro no upload para o Supabase:", error);
            return res.status(500).json({ error: error.message });
        }

        // Pegar URL pública da foto enviada
        const { data: publicUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(fileName);

        res.json({
            url: publicUrlData.publicUrl
        });

    } catch (err) {
        console.error("Erro interno no endpoint de upload:", err);
        res.status(500).json({ error: "Erro interno no upload." });
    }
});

// =====================================
// INICIAR SERVIDOR
// =====================================
app.listen(4321, () => {
    console.log("Backend rodando na porta 4321");
});
