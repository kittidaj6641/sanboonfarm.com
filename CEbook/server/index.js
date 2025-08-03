import express from "express"
import memberRoutes from "./routes/member.js"
import registerRoutes from "./routes/register.js"
import cors from "cors";


const app = express()
const port = 8080

app.use(cors())
 
app.use(express.json())
app.use("/member", memberRoutes)
app.use('/register', registerRoutes);





app.get("/", (req, res) => {
    res.json({ message: "hello KSU YES I CAN" })
})



app.listen(port, () => {
    console.log("server running at port " + port)
})
