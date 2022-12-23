const express = require('express');
const app = express();

require('dotenv').config();

// socket 세팅
const http = require('http').createServer(app);
const {Server} = require('socket.io');
const io = new Server(http);


// 미들웨어 설정
app.use(express.json());
app.set('view engine', 'ejs');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true})); 
app.use(bodyParser.json())

const cors = require("cors");
app.use(cors({
    origin: "http://localhost:3000",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
}));

var db;
const MongoClient = require('mongodb').MongoClient;
MongoClient.connect(process.env.DB_URL, function(err, client) {
    if (err) { return console.log(err) }
    db = client.db('Naru');
    app.db = db;

    http.listen(process.env.PORT, function() {
        console.log('listening on', process.env.PORT);
    })
})

// AWS 설정
const AWS = require('aws-sdk');
const multiparty = require('multiparty');

AWS.config.loadFromPath(__dirname + "/config/awsconfig.json");
const BUCKET_NAME = 'bucket-sunu';
const s3 = new AWS.S3();

const methodOverride = require('method-override');
app.use(methodOverride('_method'));

const multer = require('multer');


// public 폴더의 내용을 정적파일로 사용
app.use('/public', express.static('public'));

 
// 쿠키 미들웨어
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// 세션 미들웨어
const session = require('express-session');
const FileStore = require('session-file-store')(session);
app.use(session({
    secret: process.env.COOKIE_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60 * 3  // 3시간
    },
    store: new FileStore()
}));

// 패스포트 passport 미들웨어
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
app.use(passport.initialize());
app.use(passport.session());

// 시간 미들웨어
var moment = require('moment');

require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");


// ================================= 크롤링 ================================================== //

const crawlTime = moment().format('YYYY-MM-DD')
const puppeteer = require( "puppeteer" );
const cheerio = require( "cheerio" );
async function CrawlGame () {
        
    const browser = await puppeteer.launch({
        headless: true
    });
    const browsertest = await puppeteer.launch({
        headless: false
    });
    
    console.log("게임 크롤링 실행")
    const page = await browser.newPage()
    await page.goto('https://www.thelog.co.kr/index.do');
    const content = await page.content();
    const $ = cheerio.load(content);

    const lists = $("#game_rank > tr");
    var resultGame = []
    for (var i = 0; i < lists.length; i++){
        resultGame[i] = $(lists[i]).find("tr > td.name").text()
    }
    // const imgpage = await browsertest.newPage()
    //     await imgpage.goto('https://namu.wiki');

    //     // const inputArea = await imgpage.$('.search');
    //     // const searchBtn = await imgpage.$('#E8Ow8AfSl > span.tNb7IB9G > button:nth-child(1)');
    //     // await imgpage.waitForSelector('#KrL7prAiD > input[type=search]')
    //     // await inputArea.type('리그 오브 레전드');
    //     // await searchBtn.click()

    //     await imgpage.type('#KrL7prAiD > input[type=search]','리그 오브 레전드');
    //     await imgpage.type('#KrL7prAiD > input[type=search]', String.fromCharCode(13));
    //     const gameimg = $('#lYnqWtHhT > div.\31 0260d0f > div > div > div > div > div > div > div > div > div > article > div:nth-child(6) > div > div:nth-child(6) > div > div > div > div > div > div:nth-child(11) > div > div > div > div > div > div:nth-child(1) > div > div.JPVrx4GT.MaYP-MZ6 > table > tbody > tr:nth-child(2) > td > div > div > a > span > span > img._2wJ1XSYz').find().attr('src')
    //     console.log('gameimg : ',gameimg)
    //     await browsertest.close()

    db.collection('crawling').updateOne(
        {sort : 'game'}, 
        {$set : {
            title : resultGame,
            time : crawlTime,
            }}, function(err, result){
        if(err){
            console.log("크롤링 실패, 대상 웹페이지를 확인해보세요")
        }   
        else{
            console.log('게임순위 데이터 입력 완료')
        }
    })
    browser.close();
}

async function CrawlMovie () {
        
    const browser = await puppeteer.launch({
        headless: true
    });
    console.log("영화 크롤링 실행")
    const page = await browser.newPage();
    await page.goto('https://movie.daum.net/ranking/boxoffice/weekly');
    const content = await page.content();
    const $ = cheerio.load(content);

    const lists = $("#mainContent > div > div.box_boxoffice > ol > li");

    var name;
    var titleimg;

    lists.each((index, lists) => {
        name = $(lists).find("div > div.thumb_cont > strong > a").text();
        titleimg = $(lists).find("div > div.thumb_item > div.poster_movie > img").attr('src')
        db.collection('crawling').updateOne(
            {num : index}, 
            {$set : {
                title : name,
                titleimg : titleimg,
                time : crawlTime,
                }}, function(err, result){
            if(err){
                console.log("크롤링 실패, 대상 웹페이지를 확인해보세요")
            }   
            else{
                console.log(index + 1,'번째 영화순위 데이터 입력 완료')
            }
    
        })
    })
  
        // for (var i = 0; i < lists.length; i++){
        // resultMovieImg[i] = $(lists[i]).find("div > div.thumb_item > div.poster_movie > img").attr('src')
        // resultMovie[i] = $(lists[i]).find("div > div.thumb_cont > strong > a").text()
        // }
        // db.collection('crawling').insertOne({
        //         sort : 'movie',
        //         title : resultMovie,
        //         titleimg : resultMovieImg,
        //         time : crawlTime,
        //     }, function(err, result){
        //         if(err){
        //             console.log("크롤링 실패, 대상 웹페이지를 확인해보세요")
        //         }
        //         else{
        //             console.log('영화순위 데이터 입력 완료')
        //         }
        
        //     })
    browser.close();
}

function CrawlCheck(){
    db.collection('crawling').findOne({sort : 'time'}, function(err, result){
        if(result.time !== crawlTime){
            console.log('날짜 변경, 크롤링 재실행')
            db.collection('crawling').updateOne(
                { sort: 'time'}, { $set : {time : crawlTime}},
            )
            CrawlMovie()
            CrawlGame()
        }
        else{
            console.log('크롤링 최신 버전 : ', crawlTime)
        }
    })
}


app.get('/explore/cafe', function(req, res){
    CrawlCheck()
    db.collection('crawling').findOne({sort : 'cafe'}, function(err, result){
        res.send({
            message : "카페",
            result : result.title,
        }); 
    })
})

app.get('/explore/ent', function(req, res){
    CrawlCheck()
    db.collection('crawling').findOne({sort : 'game'}, function(err, result){
        res.send({
            message : "오락",
            result : result.title,
        }); 
    })
})

// app.get('/explore/culture', function(req, res){
//     CrawlCheck()
//     db.collection('crawling').findOne({sort : 'movie'}, function(err, result){
//         res.send({
//             message : "영화",
//             result : result.title,
//             image : result.titleimg
//         }); 
//     })
// })

app.get('/explore/culture', function(req, res){
    CrawlCheck()
    db.collection('crawling').find({
        sort : 'movietest'
    }).sort({
        'num' : 1
    }).toArray(function(err, result){
        res.send({
            message : "영화",
            result : result
        }); 
    })
})

    

// ================================= 크롤링 끝 ================================================== //


    
app.get('/', function(req, res) {
    console.log("CrawlGame?")
    CrawlGame()
    // ==================== 크롤링 DB구역에 데이터가 없을 때 한번만! =============================
    // if (true){
    //     db.collection('crawling').insertOne({
    //         sort : 'time',
    //         time : crawlTime,
    //     }, function(err, result){
    //         console.log('최초 데이터 입력')
    //         
    //     })
    // }
    // =========================================================================================
    res.render('main.ejs');   
});




app.get('/explore', function(req, res) {
    res.render('explore.ejs');             // 정보 페이지
});




app.get('/community', function(req, res) { 
    db.collection('post').find({writer: {$nin: [""]}}).toArray(function(err, result){
        result.reverse()
        if (err) {
            res.json({message : "전송 실패"})
        }
        else {
            res.status(200).send({
                message : "조회 성공",
                result : result,
            });         
        }
    });
})

app.delete('/community', function(req, res){
    // db.collection('post').deleteMany({writer : ""})
    res.json({message : "삭제 완료"})
})

// ======================================= 검색기능 테스트 영역 ===================================================== //

app.get('/test', function(req, res){
    db.collection('post').find().toArray(function(err, result){
        res.render('community.ejs', {posts : result})
    })
})

app.get('/search', function(req, res){
    const nullArr = []
    let condition = 
    [
        {
          $search: {
            index: 'postSearch',
            text: {
              query: req.query.value,
              path: {
                'wildcard': '*'
              }
            }
          }
        }
      ]
    db.collection('post').aggregate(condition).toArray(function(err, result){
        if(result.toString() == nullArr.toString()){
            res.json({message : "검색 결과 없음"})
        }
        else{
            res.send({
                message : '검색 성공',
                result : result,
            })
        }
    })
    // db.collection('post').aggregate(condition).toArray(function(err, result){
        
    //     // if (err) {
    //     //     res.json({message : "검색 오류"})
    //     // }
    //     // else if(result !== undefined){
    //     //     console.log("검색 완료");
    //     //     res.status(200).send({
    //     //         message : "검색 완료",
    //     //         result : result,
    //     //     });         
    //     // }
    //     // else{
    //     //     console.log("검색 완료, 결과값 없음")
    //     //     res.status(200).send({
    //     //         message : "검색 결과 없음",
    //     //         result : result,
    //     //     });  
    //     // }
    // })
})
// ======================================= 검색기능 테스트 영역 끝 =================================================== //


app.get('/best', function(req, res) {
    db.collection('post').find({ 
        'like_count' : { '$gt' : 0 } 
    }).sort({
        'like_count' : -1
    }).limit(3).toArray(function(err, result) {
        if (err) {
            res.json({message : "전송 실패"})
        }
        else{
            res.status(200).send({
                message : "인기글 조회 성공",
                result : result
            });
        }
    });
})

// 좋아요 구현
app.post("/community/detail/like/:id", function(req, res) {
    db.collection('post').findOne({_id : parseInt(req.params.id)}, function(err, result) {
        var chk = false
        if (!req.isAuthenticated()) {
            res.json({message : "비회원"})
        }
        else if (result.like_count == 0) {
            db.collection('post').updateOne(
                { _id: parseInt(req.params.id)},
                { $inc : {like_count : 1} , $push: { like_user: req.user._id.toString()}},
                )
            db.collection('user_info').updateOne(
                { _id: req.user._id},
                { $push: { like_post: parseInt(req.params.id)}},
            )
            res.send({
                message : "좋아요",
                like_count : result.like_count,
            }); 
        }
        else {
            for (var i = 0; i <= result.like_count; i++){
                if (result.like_user[i] == req.user._id.toString()) {
                    chk = true
                    break
                }
            }
                if (!chk) {
                    db.collection('post').updateOne(
                        { _id: parseInt(req.params.id)},
                        { $inc : {like_count : 1} , $push: { like_user: req.user._id.toString()}},
                    )
                    db.collection('user_info').updateOne(
                        { _id: req.user._id},
                        { $push: { like_post: parseInt(req.params.id)}},
                    )
                    res.send({
                        message : "좋아요",
                        like_count : result.like_count,
                    }); 
                }
                else {
                    db.collection('post').updateOne(
                        { _id: parseInt(req.params.id)},
                        { $inc : {like_count : -1} , $pull: { like_user: req.user._id.toString()}},
                    )
                    db.collection('user_info').updateOne(
                        { _id: req.user._id},
                        { $pull: { like_post: parseInt(req.params.id)}},
                    )
                    res.send({
                        message : "좋아요",
                        like_count : result.like_count,
                    }); 
                }
            }
        }
    )
})
app.get("/community/write", function(req, res) {
    db.collection('post_count').findOne({name : 'postcnt'}, function(err, result) {
        let postId = Number(result.total_post) + 1
        UpdatePostCount();
        db.collection('post').insertOne({
            _id : postId,
            user_id : req.user._id,
            writer : "",
            profile : "",
            post_title : "", 
            post_content : "", 
            like_count : 0,
            like_user : [],
            post_address : "",
            post_address_detail : "",
            image_address : new Array(4),
            post_time : moment().format('YYYY-MM-DD')
            },
            function(err, result) {
                if (err) {
                    res.json({message : "다시 시도해주세요."})
                }
                else {
                    res.json({postId : postId});         
                }
            }
        )
    })
})
app.post("/community/write/", function(req, res) {
    db.collection('post').updateOne(
        {_id: req.body.postId},
        {$set: {
            _id : req.body.postId,
            user_id : req.user._id,
            writer : req.user.nickname,
            profile : req.user.profile_image_path,
            post_title : req.body.title, 
            post_content : req.body.content, 
            like_count : 0, 
            like_user : [],
            post_address : req.body.address,
            post_address_detail : req.body.addressDetail,
            post_time : moment().format('YYYY-MM-DD')
        }}            
        ,
        function (err, result) {
            if (err) {
                res.json({message : "등록 실패"})
            }
            else {
                // console.log("post_id :", postId, " 등록");
                UpdateUserInfo(req.user._id);
                res.status(200).json({message : "등록 성공"});         
            }
        }
    )
})

function UpdateUserInfo(_id) {
    db.collection('user_info').updateOne(
        {_id : _id},
        {$inc : {user_point : 30, posting_count : 1}},
        function(err, result) {
            if (err) return console.log(err);
            else {
                console.log("user_point : 업데이트 완료");
                console.log("posting_count : 업데이트 완료");
            } 
        }
    )
}

function UpdatePostCount() {
    db.collection('post_count').updateOne(
        {name : 'postcnt'},
        {$inc :{total_post : 1}},
        function(err, result) {
            if (err) return console.log(err);
            else console.log("total_post : 업데이트 완료");
        }
    )
}

// 게시글 상세 페이지 요청 API
app.get('/community/detail/:id', function(req, res) {
    db.collection('post').findOne({_id : parseInt(req.params.id)}, function(err, result) {
        const postResult = result
        db.collection('user_info').findOne({_id : result.user_id}, function(err, result){
            if (err) { res.json({message : "글 전송 실패"}); }
            if (!req.isAuthenticated()) {
                res.status(200).send({
                    message : "비로그인",
                    postResult : postResult,
                    userResult : result
                }); 
            }
            else if (postResult.user_id.toString() === req.user._id.toString()) {
                res.status(200).send({
                    message : "일치",
                    postResult : postResult,
                    userResult : result
                });         
            }
            else {
                res.status(200).send({
                    message : "불일치",
                    postResult : postResult,
                    userResult : result
                });  
            }
        })
        
    })
})

// 게시글 수정 데이터 요청 API
app.get("/community/edit/:id", function(req, res) {
    db.collection('post').findOne({_id : parseInt(req.params.id)}, function(err, result){
        if (err) return err;
        res.status(200).send({
            message : "전송",
            result : result
        });         
    });
})

// 게시글 수정 API
app.put('/community/edit/:id', function(req, res) {

    var titlechk = true
    var addresschk = true
    var addressDetailchk = true
    var contentchk = true

    if (req.body.title == ""){
        titlechk = false
    }
    if (req.body.address == ""){
        addresschk = false
    }
    if (req.body.addressDetail == ""){
        addressDetailchk = false
    }
    if (req.body.content == ""){
        contentchk = false
    }

    db.collection('post').findOne({_id : parseInt(req.params.id)},function(err, result){
        db.collection('post').updateOne(
            {_id : parseInt(req.params.id)}, 
            {$set : {
                post_title : titlechk ? req.body.title : result.post_title, 
                post_content : contentchk? req.body.content : result.post_content,
                post_address : addresschk? req.body.address : result.post_address,
                post_address_detail : addressDetailchk? req.body.addressDetail : result.post_address_detail,
            }}, 
            function(err, result) {
                if (err) { res.json({message : "수정 실패"}); }
                else {
                    res.status(200).send({message : "수정 성공"});
                }
            }
        );
    })
    
})

// 게시글 삭제 API
app.delete('/community/delete/:id', function(req, res) {
    db.collection('post').findOne({_id : parseInt(req.params.id)}, function(err, result) {
        if (err) { res.json({message : "삭제 실패"}); }
        if (result.user_id.toString() === req.user._id.toString()) {
            // 게시글 삭제
            db.collection('post').deleteOne({_id : parseInt(req.params.id)}, function(err, result) {
                // 포인트 -30, 게시글 수 -1
                db.collection('user_info').updateOne(
                    {_id : req.user._id}, 
                    {$inc : {user_point : -30, posting_count : -1}}, 
                    function(err, result) {
                        res.json({message : "삭제 완료"});
                    }
                );
            });
            // AWS 이미지 삭제
            // ...
        }
        else { res.json({message : "삭제 실패"}); }
    });
})

// 포인트 페이지
app.get("/point", function(req, res){
    if (!req.isAuthenticated()) {
        res.json({message : "비회원"})
    }
    else{
        db.collection('user_info').findOne({_id : req.user._id}, function(err, result){
            res.send({
                message : "포인트게임",
                point : result.user_point
            }); 
        })
    }
})

app.post("/point/start", function(req, res){
    if (!req.isAuthenticated()) {
        res.json({message : "비회원"})
    }
    else if (req.body.point < 100){
        res.json({message : "포인트 부족"})
    }
    else{
        var tempPoint = req.body.point
        const cardValue = Math.floor(Math.random() * 100) + 1
        const value = req.body.value
        var CardResult = ""

        // 카드값 정하기
        console.log(cardValue)
        if(cardValue > 0 && cardValue <= 5){
            CardResult = "UR"
        }
        else if(cardValue > 5 && cardValue <= 20){
            CardResult = "SR"
        }
        else if(cardValue > 20 && cardValue <= 55){
            CardResult = "R"
        }
        else if(cardValue > 55 && cardValue <= 100){
            CardResult = "N"
        }

        // 포인트 정산
        if (CardResult ==  'N'){
            tempPoint = tempPoint - 80
        }
        else if (CardResult ==  'R'){
            tempPoint = tempPoint - 55
        }
        else if (CardResult ==  'SR'){
            tempPoint = tempPoint + 100
        }
        else if (CardResult ==  'UR'){
            tempPoint = tempPoint + 300
        }
        db.collection('user_info').updateOne(
            {_id : req.user._id},
            {$set : {user_point : tempPoint}}, function(err, result){
                console.log("point : ", tempPoint)
                console.log("value : ",value)
                console.log("cardValue : ",CardResult)
                res.send({
                    message : "포인트게임 완료",
                    point : tempPoint,
                    value : value,
                    cardValue : CardResult,
                });   
        })
    }
})

app.post("/point/result", function(req, res){
    const card = req.body.card
    var score = 0

    if (!req.isAuthenticated()) {
        res.json({message : "비회원"})
    }
    else{
        if (card == "N"){
            score = 20
        }
        else if (card == "R"){
            score = 45
        }
        else if (card == "SR"){
            score = 200
        }
        else if(card == "UR"){
            score = 400
        }
        else{
            res.json({message : "에러"})
        }
        db.collection('user_info').updateOne(
            {_id : req.user.id},
            {$inc : {user_point : score}}, function(err, result){
            res.send({
                message : "포인트게임 완료",
                point : result.user_point
            }); 
        })
    }
})


// app.post('/point', function(req,res) { 
//     if (!req.isAuthenticated()) {
//         res.send('<script>alert("로그인해주세요"); location.href="/signin";</script>')
//     }
//     else {
//         db.collection('user_info').updateOne(
//             {id : req.user.id}, 
//             {$set : {point : req.body.getpoint}}, 
//             function(err, result) {
//                 if (err) return err;
//                 console.log('process complete')
//                 res.redirect('/point');
//             }
//         )
//     }
// })


// control - userinfo 시작 ///////////////////////////////////////////////////////////////////////////

// 내 정보 요청 API
app.get('/mypage', (req, res) => {
    db.collection('user_info').findOne({_id : req.user._id}, function(err, result) {
        const userResult = result;
        if (err) { res.json({message: "로그인 필요"}); }
        else{
            db.collection('post').find({like_user : req.user._id.toString()}).sort({'_id' : -1}).limit(3).toArray(function (err, result) {
                const likeResult = result;
                db.collection('post').find({user_id : req.user._id}).sort({'_id' : -1}).limit(3).toArray(function(err, result){
                    res.send({
                        message: "불러오기",
                        profile: userResult.profile_image_path,
                        nickname: userResult.nickname,
                        user_level: userResult.user_level,
                        user_point: userResult.user_point,
                        posting_count: userResult.posting_count,
                        like_post: likeResult,
                        write_post : result
                    });
                });
            });
        }
    });
})

// 회원정보 요청 API
app.get('/mypage/edit', (req, res) => {
    res.send({
        message: "불러오기",
        profile: req.user.profile_image_path,
        email: req.user.email,
        nickname: req.user.nickname,
    });
})

// 회원정보 수정 API
app.post('/mypage/edit', (req, res) => {
    // 닉네임 변경
    var nicknamechk = true

    if (req.body.nickname == ""){
        nicknamechk = false
    }
    db.collection('user_info').findOne({nickname : req.body.nickname}, (err, result) => {
        if (err) { return console.log(err); }
        if (result) { res.json({message: "사용중인 닉네임입니다."}); }
        else {
            db.collection('user_info').findOne({_id : req.user._id}, (err, result) => {
                db.collection('post').update(
                    {user_id : req.user._id},
                    {$set : {writer : nicknamechk ? req.body.nickname : result.writer}}
                )
                db.collection('user_info').updateOne(
                    {_id : req.user._id},
                    {$set : {nickname : nicknamechk ? req.body.nickname : result.nickname}},
                    (err, result) => {
                        if (err) { return console.log(err); }
                        console.log("닉네임 변경 : ", req.user.nickname, " => ", req.body.nickname);
                        res.json({message: "수정 성공"});
                    }
                )
            })
            
        }
    });
})

// 비밀번호 재확인 API
app.post('/mypage/editpw/check', (req, res) => {
    db.collection('user_info').findOne({_id : req.user._id}, (err, result) => {
        if (err) { return console.log(err); }
        if (result.password === req.body.password) { res.json({message: "비밀번호 일치"}); }
        else { res.json({message: "비밀번호가 일치하지 않습니다."}); }
    });
})

app.put('/mypage/editpw/change', (req, res) => {
    db.collection('user_info').updateOne(
        {_id : req.user._id},
        {$set : {password : req.body.password}},
        (err, result) => {
            if (err) { return console.log(err); }
            console.log("변경내역 : ", req.user.password, " => ", req.body.password);
            res.json({message: "비밀번호가 변경되었습니다."});
    });
})

// 좋아요한 게시물 요청
app.get('/mypage/like', (req, res) => { 
    db.collection('post').find({like_user : req.user._id.toString()}).sort({'_id' : -1}).toArray(function(err, result){
        res.send({
            message : "좋아요",
            result : result
        }); 
    })
})

app.get('/mypage/post', (req, res) => { 
    db.collection('post').find({user_id : req.user._id}).sort({'_id' : -1}).toArray(function(err, result){
        res.send({
            message : "게시글",
            result : result
        }); 
    })
})
        
    
    



// 내가 쓴 게시물 요청


// control - userinfo 끝 ////////////////////////////////////////////////////////////////////////////


// control - image 시작 //////////////////////////////////////////////////////////////////////////////

// 프로필 이미지 업로드 API
app.post('/mypage/profile', (req, res) => {
    console.log("upload profile req :", req.user._id);
    const form = new multiparty.Form();
    const userID = req.user._id;
    const imageDir = "profile/" + userID + "/";
    let profilePath;

    // err 처리
    form.on('error', err => { res.status(500).end(); });
    
    // form 데이터 처리
    form.on('part', async part => {
        profilePath = process.env.IMAGE_SERVER + "/" + imageDir + part.filename;
        // 이미지 저장 디렉토리
        if (!part.filename) { return part.resume(); }
        streamToBufferUpload(part, imageDir + part.filename);
        console.log("경로 :", imageDir + part.filename)
        db.collection('user_info').updateOne(
            {_id : req.user._id}, 
            {$set : {profile_image_path: profilePath}},
            (err, result) => {
                if (err) { return console.log(err); }
                else { console.log("profile_path :", profilePath); } 
            }
        );
    });
        
        // form 종료
    form.on('close', () => {        
        setTimeout(() => { res.send({location: profilePath}) }, 1000)
    });

    form.parse(req);
})

// 프로필 이미지 삭제 API
app.delete('/mypage/profile', (req, res) => {
    console.log("delete profile req :", (req.query))
    const objectParams_del = {
        Bucket: BUCKET_NAME,
        Key: (req.query.url).substr(52),
    };

    s3
        .deleteObject(objectParams_del)
        .promise()
        .then((data) => {
            res.send({
                message: "삭제 성공",
                profile: ""
            });
        })
        .catch((error) => {
            console.error(error);
        });

    db.collection('user_info').updateOne(
        {_id : req.user._id}, 
        {$set : {profile_image_path: ""}}, 
        (err, result) => {
            if (err) { return console.log(err); }
            else { console.log(process.env.IMAGE_SERVER + "/" + (req.query.url).substr(52)) } 
        }
    );
})

// 게시글 이미지 업로드 API
app.post('/image/upload', (req, res) => {
    console.log("/image/upload req");
    const form = new multiparty.Form();
    const userID = req.user._id;
    let imageAddress;

    // err 처리
    form.on('error', (err) => { res.status(500).end(); })
    
    // form 데이터 처리
    form.on('part', async (part) => {
        imageAddress = process.env.IMAGE_SERVER + "/" + userID + "/" + part.filename;
        const postID = Number(part.filename.split('/')[0]);
        // 파일명 X : 이미지 저장 디렉토리
        if (!part.filename) {
            res.send({
                message: "파일명이 올바르지 않습니다.",
                location: ""
            });
        }
        else {
            // 작성중인 빈 게시글 검색
            db.collection('post').findOne({_id: postID}, (err, result) => {
                console.log("postid :", postID, "OK")
                // 작성중인 빈 게시글이 삭제된 경우
                if (!result) {
                    console.log("유효하지 않은 요청")
                    res.send({
                        message: "유효하지 않은 요청",
                        location: ""
                    });
                }
                // 파일명 OK, 배열에 O => 추가 X
                else if (result.image_address.indexOf(imageAddress) !== -1) {
                    console.log("이미 존재하는 파일")
                    res.send({location: ""}); 
                }
                // 파일명 OK, 배열에 X => 추가 O
                else {
                    console.log("새로운 이미지 추가")
                    streamToBufferUpload(part, userID + "/" + part.filename);
                    db.collection('post').findOne({_id : postID}, (err, result) => {
                        let target = result.image_address;
                        target[result.image_address.indexOf(null)] = imageAddress;
                        db.collection('post').updateOne(
                            {_id : postID},
                            {$set : {image_address : target}},
                            (err, result) => {
                                console.log("modified :", result.modifiedCount);
                            }
                        )
                    })
                }            
            })
        }
    });

    // form 종료
    form.on('close', () => {
        setTimeout(() => { res.send({location: imageAddress}) }, 1000);
    });

    form.parse(req);

    
});

// 게시글 이미지 삭제 API
app.delete('/image/delete', (req, res) => {
    const decodeUrl = decodeURIComponent(req.query.url)
    const postID = Number(decodeUrl.split('/')[4]);
    console.log("/image/delete req :", postID);
    
    // AWS 이미지 삭제
    const objectParams_del = {
        Bucket: BUCKET_NAME,
        Key: (decodeUrl).substr(52),
    };
    
    s3
        .deleteObject(objectParams_del)
        .promise()
        .then((data) => {
        })
        .catch((error) => {
            console.error(error);
        });

    // 이미지 주소 삭제
    db.collection('post').findOne({_id: postID}, (err, result) => {
        // 이미지 주소 X
        if (!result) { res.send({message: "삭제 성공"}); }
        // 이미지 주소 O
        else {
            let targetObj = result.image_address;
            console.log("이미지 address :", result.image_address)
            const targetIdx = Number(result.image_address.indexOf(decodeUrl));
            console.log("지울 이미지 :", decodeUrl)
            console.log("타겟 인덱스 :", targetIdx)
            let removeUrl = targetObj.splice(targetIdx, 1);
            console.log("remove :", removeUrl);
            targetObj[3] = null;

            db.collection('post').updateOne(
                {_id: postID},
                {$set: {image_address: targetObj}},
                (err, result) => { res.send({message: "삭제 성공"}); }
            );
        }
    });
})

const streamToBufferUpload = (part, key) => {
    const chunks = [];
    return new Promise((resolve, reject) => {
        part.on('data',   (chunk) => chunks.push(Buffer.from(chunk)));
        part.on('error',  ( err ) => reject(err));
        part.on('end',    (     ) => resolve(Buffer.concat(chunks)));
        uploadToBucket(key, part);
    });
}

const uploadToBucket = (key, Body) => {
    const params = {
        Bucket:BUCKET_NAME,
        Key:key,
        Body,
        ContentType: 'image'
    }
    const upload = new AWS.S3.ManagedUpload({ params });
    upload.promise();
}

// control - image 끝 ///////////////////////////////////////////////////////////////////////////////


// service - auth 시작 ///////////////////////////////////////////////////////////////////////////////

// header 로그인 인증
app.post('/islogin', (req, res) => {
    if (!req.user) { res.send({message: "로그인 실패"}); }
    else {
        res.send({
            message: "로그인 성공",
            nickname: req.user.nickname,
            user_level: req.user.user_level
        });
    }
})

// 로그아웃 API
app.post('/signout', (req, res) => {
    req.logout(() => {
        console.log("/signout req");
        req.session.destroy();
        res.clearCookie('connect.sid').send({message: "로그아웃"});
    });
})

// 로그인 API
app.post('/signin', passport.authenticate('local', {}), (req, res) => {
    console.log("signin req :", req.user.email);
    res.send({message: "로그인 성공"});
})

passport.use(new localStrategy({
        usernameField: 'email',
        passwordField: 'password',
        session: true,
        passReqToCallback: false,
    }, 
    (inputemail, inputpw, done) => {
        console.log("signin : " + inputemail);
        db.collection('user_info').findOne({email: inputemail}, (err, user) => {
            if (err) { return done(err); }
            if (!user) { return done(null, false, console.log({message: "존재하지 않는 아이디입니다."})); }
            if (user.password === inputpw) { return done(null, user); }
            return done(null, false, console.log({message: "올바르지않은 비밀번호."}));
        });
    }
));

passport.serializeUser((user, done) => {
    console.log("serialize :", user.email);
    done(null, user.email);
});

passport.deserializeUser((usermail, done) => {
    console.log("deserialize :", usermail);
    db.collection("user_info").findOne({email: usermail}, (err, user) => {
        if (err) { return next(err); }
        done(null, user);
    });
});

// 인증메일 발송 API
app.post('/signup/mail', (req, res) => {
    console.log("/signup/mail request :", req.body.email);

    if (!req.body.email) { res.json({ message: "올바른 이메일이 아닙니다." }) }
    if (req.body.email) {
        // 이메일 중복 검사
        db.collection('user_info').findOne({ email : req.body.email }, (err, result) => {
            if (err) { return console.log(err); }
            if (result !== null) {
                // Case 1.
                console.log("/signup/mail response :", { message: "사용중인 이메일입니다." });
                res.json({ message: "사용중인 이메일입니다." });
            } 
            if (result === null) {
                db.collection("auth_request").findOne({ email: req.body.email }, (err, result) => {
                    if (err) { return console.log(err); }
                    // Case 2.
                    if (result !== null) {
                        console.log("/signup/mail response :", { message: "이미 요청이 발생한 이메일입니다." });
                        res.json({ message: "이미 요청이 발생한 이메일입니다." });
                    }
                    // Case 3.
                    if (result === null) {
                        SendAuthMail(req.body.email);
                        console.log("/signup/mail response :", { message: "인증메일이 발송되었습니다." });
                        res.json({ message: "인증메일이 발송되었습니다." });
                    } 
                });
            }
        });
    }
})

// 인증메일 변수
const ejs = require('ejs');
const nodemailer = require('nodemailer');
const path = require('path');
const appDir = path.dirname(require.main.filename) + '/templates/authMail.ejs';

// 인증메일 발송 function
const SendAuthMail = (address) => {
    let authNum = Number(Math.random().toString().substr(2,6));
    let emailtemplate;

    ejs.renderFile(appDir, {authCode : authNum}, (err, data) => {
        if (err) { return console.log(err); }
        emailtemplate = data;
    });

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.NODEMAILER_USER,
            pass: process.env.NODEMAILER_PASS
        }
    });

    let mailOptions = {
        from: `나루`,
        to: address,
        subject: '회원가입을 위한 인증번호를 입력해주세요.',
        html: emailtemplate
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) { return console.log(err); } 
        console.log("Mail sent. " + info.response);
        transporter.close();
    });

    db.collection("auth_request").insertOne({
        email      : address,
        auth_number: authNum,
    }, 
    (err, result) => {
        if (err) { return console.log(err); }
        return true;
    });
}

// 인증번호 확인 API
app.post('/signup/auth', (req, res) => {
    // 인증내역 발생 확인
    db.collection("auth_request").findOne({email: req.body.email},
        function(err, result) {
            console.log("/signup/auth check req :", req.body.email);
            if (err) { res.json({number: req.body.authNum}); }                
            if (result === null) { res.json({message: "인증 요청된 이메일이 아닙니다."}); }                
            if (result.auth_number === Number(req.body.authNum)) {res.json({message: "인증되었습니다."});}
            else res.json({message: "인증번호가 일치하지 않습니다."});
        }
    );
})

// 회원가입 요청 API
app.post('/signup', (req, res) => {
    // nickname 중복검사
    db.collection('user_info').findOne({nickname : req.body.nickname}, (err, result) => {
        console.log("/signup req :", req.body.email);
        if (err) { return console.log(err); } 
        if (result !== null) { res.json({message: "이미 사용중인 닉네임입니다."}); } 
        else {
            db.collection("user_info").insertOne({
                email               : req.body.email,
                nickname            : req.body.nickname,
                password            : req.body.password,
                profile_image_path  : "",
                posting_count       : 0,
                like_post           : [],
                user_point          : 0,
                user_level          : 1,
                daily_point         : 0,
            }, 
            (err, result) => {
                if (err) { res.json({message: "가입오류"}); }
                // 가입완료 후 해당 회원의 인증요청 삭제
                db.collection("auth_request").deleteOne({email: req.body.email});
                console.log("/signup 신규회원 : ", req.body.email);
                res.json({message: "가입되었습니다.🎉"});
            });       
        }
    });
})

// service - auth 끝 ////////////////////////////////////////////////////////////////////////////////