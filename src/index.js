const express = require('express');
const payRoutes = require('./router/payRoutes');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
app.use(bodyParser.json());

app.get('/', (req, res) => {
	res.send("<h2>Hello world!</h2>");
});

app.use('/payments', payRoutes);

app.listen(PORT, () => {
  console.log('API is listening on port ', PORT);
});