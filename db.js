const mysql = require ('mysql2');
require('dotenv').config();


const connection = mysql.createPool({
    connectionLimit:10,
    host: process.env.DB_HOST, 
    user: process.env.DB_USER, 
    password:process.env.DB_SENHA, 
    database: process.env.DB_NAME, 
    port: process.env.DB_PORTA
});


connection.getConnection((err, conn) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        return;
    }
    console.log('Conexão bem-sucedida ao banco de dados');
    conn.release(); 
});

module.exports = connection;