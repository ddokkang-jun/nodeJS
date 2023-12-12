const express = require('express');
const app = express();

// 스타일 폴더 서버에 등록하기
app.use(express.static(__dirname + '/public'));
// express 에서 ejs 사용등록하기
app.set('view engine', 'ejs');
//요청.body 를 사용하기위한 셋팅코드
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 몽고디비연결
const { MongoClient } = require('mongodb');
let db;
const url =
  'mongodb+srv://admin:qwer1234@cluster0.5lk2o3z.mongodb.net/?retryWrites=true&w=majority';
new MongoClient(url)
  .connect()
  .then((client) => {
    console.log('1 : DB연결성공');
    db = client.db('forum');

    app.listen(8080, () => {
      console.log('2 : http://localhost:8080 에서 서버 실행중');
    });
  })
  .catch((err) => {
    console.log(err);
  });

// 페이지 라우트
app.get('/', function (요청, 응답) {
  응답.sendFile(__dirname + '/index.html');
});

app.get('/about', function (요청, 응답) {
  응답.sendFile(__dirname + '/about.html');
});

app.get('/list', async (req, res) => {
  let result = await db.collection('post').find().toArray();
  res.render('list.ejs', { list: result });
});

app.get('/time', (req, res) => {
  let time = new Date();
  res.render('time.ejs', { 시간: time });
});

app.get('/write', (req, res) => {
  res.render('write.ejs');
});

// post 요청
app.post('/add', (req, res) => {
  console.log(req.body);
});
