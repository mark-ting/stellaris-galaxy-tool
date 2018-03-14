const express = require('express')
const path = require('path')

const app = express()
const port = 3000 || process.env.PORT

const src = path.join(__dirname, '/')
app.use(express.static(src))

app.listen(port, () => {
  console.log(`App started on port ${port}`)
})
