require('dotenv').config()
const express = require('express')
const connectDB = require('./src/DB/database.DB')
const userrouter = require('./src/routes/user.routes')

const cookieParser = require('cookie-parser')

const cors = require('cors')
const { subsciptionrouter } = require('./src/routes/subscription.routes')



const app = express()

app.use(cors({
    origin: '*', // This allows all origins, not recommended for production
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