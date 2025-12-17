import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import swaggerUi from "swagger-ui-express"
import swaggerSpec from "./swagger.js"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Vaadi Booking API Docs'
}))

// Routes import
import userRouter from './routes/user.routes.js'
import villageRouter from './routes/village.routes.js'

// Routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/villages", villageRouter)

export { app }