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
// ENDPOINT DE UPLOAD DE AVATAR
// =====================================
app.post("/upload-avatar", upload.single("avatar"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Nenhuma imagem enviada." });
        }

        const file = req.file;
        const fileName = `avatar-${Date.now()}.png`; // nome único

        // Upload para Supabase
        const { data, error } = await supabase.storage
            .from("avatars")
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }

        // Pegar URL pública da foto enviada
        const publicUrl = supabase.storage
            .from("avatars")
            .getPublicUrl(fileName);

        res.json({
            url: publicUrl.data.publicUrl
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro interno no upload." });
    }
});

// =====================================
// INICIAR SERVIDOR
// =====================================
app.listen(4321, () => {
    console.log("Backend rodando na porta 4321");
});
