const express = require('express');
const app = express();
const { MongoClient, ObjectId } = require('mongodb');
const methodOverride = require('method-override');
const bcrypt = require('bcrypt');
require('dotenv').config();

app.use(methodOverride('_method'));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const MongoStore = require('connect-mongo');

app.use(passport.initialize());
app.use(
  session({
    secret: '암호화에 쓸 비번',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 },
    store: MongoStore.create({
      mongoUrl: process.env.DB_URL,
      dbName: 'forum',
    }),
  })
);
app.use(passport.session());

// aws 라이브러리 셋팅코드
const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = new S3Client({
  region: 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'kazuy0002firstforumbucket',
    key: function (요청, file, cb) {
      cb(null, Date.now().toString()); //업로드시 파일명 변경가능
    },
  }),
});

// 미들웨어
app.use('/list', checkoutTime);

function checkoutTime(req, res, next) {
  // 미들웨어 수업 1번째 숙제
  let time = new Date();
  console.log('현재시간 :', time);
  next();
}

function checkUser(req, res, next) {
  // 미들웨어 수업 2번째 숙제
  if (req.body.username == '' || req.body.password == '') {
    res.send('그러지마세요');
  } else {
    next();
  }
}

// 몽고디비연결
let db;
const url = process.env.DB_URL;
new MongoClient(url)
  .connect()
  .then((client) => {
    console.log('1 : DB연결성공');
    db = client.db('forum');

    app.listen(process.env.PORT, () => {
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
app.post('/add', upload.single('img1'), async (req, res) => {
  //console.log(req.file);

  // if (!req.file) {
  //   console.log('사진파일이 없음');
  // } else {
  //   console.log('사진파일이 있음');
  // }

  try {
    if (req.body.title == '' || req.body.content == '') {
      res.send('빈곳이 있으면 안뎀');
    } else {
      await db.collection('post').insertOne({
        title: req.body.title,
        content: req.body.content,
        img: req.file.location,
      });
      res.redirect('/list/1');
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
      res.redirect('/list/1');
    }
  } catch (error) {
    res.send('에러남', error);
  }
});

passport.use(
  new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    let result = await db
      .collection('user')
      .findOne({ username: 입력한아이디 });
    if (!result) {
      return cb(null, false, { message: '아이디 DB에 없음' });
    }
    if (await bcrypt.compare(입력한비번, result.password)) {
      return cb(null, result);
    } else {
      return cb(null, false, { message: '비번불일치' });
    }
  })
);

passport.serializeUser((user, done) => {
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username });
  });
});

passport.deserializeUser(async (user, done) => {
  let result = await db
    .collection('user')
    .findOne({ _id: new ObjectId(user.id) });
  delete result.password;
  process.nextTick(() => {
    return done(null, result);
  });
});

app.get('/login', (req, res) => {
  res.render('login.ejs');
});

app.post('/login', checkUser, async (요청, 응답, next) => {
  passport.authenticate('local', (error, user, info) => {
    if (error) return 응답.status(500).json(error);
    if (!user) return 응답.status(401).json(info.message);
    요청.logIn(user, (err) => {
      if (err) return next(err);
      응답.redirect('/');
    });
  })(요청, 응답, next);
});

app.get('/register', (req, res) => {
  res.render('register.ejs');
});

app.post('/register', checkUser, async (req, res) => {
  const username = req.body.username;
  const password = await bcrypt.hash(req.body.password, 10);

  // if (!username || !password) {
  //   return res.status(400).send('username or password is missing');
  // }
  // 미들웨어서 확인해도록 해놔서 생략함.

  const existingUser = await db.collection('user').findOne({ username });

  if (existingUser) {
    return res.status(409).send('username is already exists');
  }

  await db.collection('user').insertOne({
    username,
    password,
  });
  res.redirect('/');
});

// delete 요청
app.delete('/delete', async (req, res) => {
  let result = await db
    .collection('post')
    .deleteOne({ _id: new ObjectId(req.query.docid) });
  res.redirect('/list');
});
