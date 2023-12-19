const express = require('express');
const app = express();
const { MongoClient, ObjectId } = require('mongodb');

// form에서 put, delete 요청 가능하도록 셋팅 (수업참고 : part2-07번)
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

// 스타일 폴더 서버에 등록하기
app.use(express.static(__dirname + '/public'));
// express 에서 ejs 사용등록하기
app.set('view engine', 'ejs');
//요청.body 를 사용하기위한 셋팅코드
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 몽고디비연결
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

app.get('/list/:number', async (req, res) => {
  const itemsPerPage = 5;
  const currentPage = parseInt(req.params.number) || 1;

  const totalCount = await db.collection('post').countDocuments();
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const result = await db
    .collection('post')
    .find()
    .skip((currentPage - 1) * itemsPerPage)
    .limit(itemsPerPage)
    .toArray();

  res.render('list.ejs', {
    list: result,
    totalPages: totalPages,
    currentPage: currentPage,
  });
});

app.get('/time', (req, res) => {
  let time = new Date();
  res.render('time.ejs', { 시간: time });
});

app.get('/write', (req, res) => {
  res.render('write.ejs');
});

app.get('/detail/:id', async (req, res) => {
  try {
    const result = await db
      .collection('post')
      .findOne({ _id: new ObjectId(req.params.id) });
    if (result) {
      res.render('detail.ejs', { detail: result });
    } else {
      // 데이터가 없다면
      res.status(404).json({ message: '데이터를 찾을 수 없습니다.' });
    }
  } catch (error) {
    console.error('상세페이지 에러 발생:', error);
    res.status(500).json({ message: '서버 에러 발생' });
  }
});

app.get('/edit/:id', async (req, res) => {
  try {
    const result = await db
      .collection('post')
      .findOne({ _id: new ObjectId(req.params.id) });
    if (result) {
      res.render('edit.ejs', { editResult: result });
    } else {
      // 데이터가 없다면
      res.status(404).json({ message: '데이터를 찾을 수 없습니다.' });
    }
  } catch (error) {
    console.error('상세페이지 에러 발생:', error);
    res.status(500).json({ message: '서버 에러 발생' });
  }
});

// post 요청
app.post('/add', async (req, res) => {
  try {
    if (req.body.title == '' || req.body.content == '') {
      res.send('빈곳이 있으면 안뎀');
    } else {
      await db
        .collection('post')
        .insertOne({ title: req.body.title, content: req.body.content });
      res.redirect('/list');
    }
  } catch (error) {
    res.send('에러남', error);
  }
});

app.post('/edit', async (req, res) => {
  try {
    if (req.body.title == '' || req.body.content == '') {
      res.send('빈곳이 있으면 안뎀');
    } else {
      await db
        .collection('post')
        .updateOne(
          { _id: new ObjectId(req.body.id) },
          { $set: { title: req.body.title, content: req.body.content } }
        );
      res.redirect('/list');
    }
  } catch (error) {
    res.send('에러남', error);
  }
});

// delete 요청
app.delete('/delete', async (req, res) => {
  let result = await db
    .collection('post')
    .deleteOne({ _id: new ObjectId(req.query.docid) });
  res.redirect('/list');
});
