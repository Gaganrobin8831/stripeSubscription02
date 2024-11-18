require('dotenv').config()
const express = require('express')
const app = express()
const connectDB = require('./src/DB/database.DB')
const userrouter = require('./src/routes/user.routes')
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');

const cookieParser = require('cookie-parser')
const swaggerDocument = yaml.load('./swagger.yaml');
const cors = require('cors')
const { subsciptionrouter } = require('./src/routes/subscription.routes')

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));



app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
}));


const port = process.env.PORT || 2132;

app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use('/', userrouter)
app.use('/', subsciptionrouter)

app.get('/', (req, res) => {
    res.send('Hello World')
})

connectDB()
    .then(() => {
        app.listen(port, () => {
            console.log(`Server is running on port http://localhost:${port}/`)
        })
    })
    .catch((err) => {
        console.log(err);
    })