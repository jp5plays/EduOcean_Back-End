const connection = require('./db');
require('dotenv').config();
const jwt = require("jsonwebtoken");
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
app.use(bodyParser.json());
app.use(cors());

app.post('/api/registro', (req, res) => {
    const { nome, email, ra, senha } = req.body;

    // Primeiro, verifica se o email já existe
    connection.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Erro ao verificar o usuário' });
        }

        // Se já existir um usuário com o mesmo email, envia uma mensagem de erro
        if (results.length !== 0) {
            return res.status(400).json({ message: 'Já existe um usuário cadastrado com este email, tente novamente com outro.' });
        }

        // Caso não exista, insere o novo usuário
        const query = 'INSERT INTO users (nome, email, ra, senha) VALUES (?, ?, ?, ?)';
        connection.query(query, [nome, email, ra, senha], (err, results) => {
            if (err) return res.status(500).json({ error: 'Erro ao registrar o usuário' });
            res.status(201).json({ id: results.insertId, nome, email, ra, senha });
        });
    });
});


app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;

    // Query para buscar o usuário pelo email
    connection.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Erro no servidor. Tente novamente mais tarde.' });
        }

        // Verificar se o usuário existe
        if (results.length === 0) {
            return res.status(401).json({ message: 'Usuário ou senha inválidos' });
        }

        // Verificar se a senha corresponde
        const user = results[0]; // A primeira linha do resultado é o usuário encontrado
        if (senha === user.senha) {
            // Extrair as variáveis necessárias para o token
            const { nome, id, email } = user;

            // Gerar o token JWT com o nome e id do usuário
            const token = jwt.sign({ email, nome, id }, process.env.SECRET_KEY, { expiresIn: "1h" });

            // Retornar o token e a mensagem de sucesso
            return res.status(200).json({ message: 'Usuário logado com sucesso!', token, ok: true });
        }

        // Se a senha não for válida, retornar erro
        res.status(401).json({ message: 'Usuário ou senha inválidos' });
    });
});

app.get("/verify", (req, res) => { 
    const token = req.headers.authorization;

    jwt.verify(token ,process.env.SECRET_KEY,(error, decoded)=>{
        if(error){
           res.json({message:"Token Inválido: Faça o login novamente"})
           return
        }
        res.json({ok:true})

    })
});

app.get("/getname",(req,res) => {
    const token = req.headers.authorization;
    const decoded = jwt.verify(token ,process.env.SECRET_KEY,(err,decoded)=>{

        if(err){
            res.json({message:"Token Inválido: Faça o login novamente"})
        }

        res.json({name:decoded.nome})
         

    });

    
});

app.get("/getemail",(req,res) => {
    const token = req.headers.authorization;
    const decoded = jwt.verify(token ,process.env.SECRET_KEY,(err,decoded)=>{

        if(err){
            res.json({message:"Token Inválido: Faça o login novamente"})
            console.log(err)
        }

        res.json({email:decoded.email})
         

    });

    
});

app.post("/rankin/save", (req,res)=>{
    const{nome,pontos,email} = req.body
    connection.query('INSERT INTO rankin  (nome, pontos,email, data_hora) values (?,?,?,NOW())', [nome,pontos,email],(err,results)=>{
    if(err){
        console.log(err)
        return res.status(500).json({ error: 'Erro ao cadatrar a pontuação' });
    }
    res.json({message:'Pontuação salva com sucesso'})
    });
});

app.post("/rankin", (req,res)=>{
    connection.query('SELECT nome, email, MAX(pontos) AS pontos, MAX(data_hora) AS data_hora FROM rankin GROUP BY nome, email ORDER BY pontos DESC, data_hora DESC LIMIT 5',(err,results)=>{
        if(err){
            console.log(err)
        }
        res.json(results);

    });
});

// Rota de API para buscar o quiz
app.get('/api/quizzes', (req, res) => {
    const assunto = req.query.assunto;

    if (!assunto) {
        return res.status(400).json({ error: 'O assunto é obrigatório!' });
    }

    const query = `
        SELECT q.id AS question_id, q.question, q.answer, o.id AS option_id, o.option
        FROM questions q
        JOIN options o ON q.id = o.question_id
        JOIN quizzes quiz ON q.quiz_id = quiz.id
        WHERE quiz.title = ?;
    `;

    connection.query(query, [assunto], (err, results) => {
        if (err) {
            console.error('Erro na consulta ao banco de dados:', err);
            return res.status(500).json({ error: 'Erro ao buscar dados do quiz' });
        }

        // Organiza os dados das perguntas e alternativas em um formato adequado
        const quizData = results.reduce((acc, row) => {
            if (!acc[row.question_id]) {
                acc[row.question_id] = {
                    id: row.question_id,
                    question: row.question,
                    answer: row.answer,
                    options: []
                };
            }
            acc[row.question_id].options.push(row.option);
            return acc;
        }, {});

        // Converte as perguntas agrupadas no formato desejado
        const formattedQuiz = {
            questions: Object.values(quizData).map(question => ({
                id: question.id,
                question: question.question,
                answer: question.answer,
                options: question.options
            }))
        };

        res.json(formattedQuiz);
    });
});











app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});