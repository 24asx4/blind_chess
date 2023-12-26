var express = require('express');
var app= express();
var serv = require('http').Server(app);

app.get('/',function(req, res){
    res.sendFile(__dirname+'/client/index.html');
});
app.use('/client',express.static(__dirname+'/client'));
var port=8123;
serv.listen(port);
console.log(`Server started and listen on ${port}.`);
let turn=1;
let chess_type=["red_soldier","red_soldier","red_soldier","red_soldier","red_soldier",
                "black_soldier","black_soldier","black_soldier","black_soldier","black_soldier",
                "red_cannon","red_cannon",
                "black_cannon","black_cannon",
                "red_horse","red_horse",
                "black_horse","black_horse",
                "red_car","red_car",
                "black_car","black_car",
                "red_elephant","red_elephant",
                "black_elephant","black_elephant",
                "red_knight","red_knight",
                "black_knight","black_knight",
                "red_king",
                "black_king"];
let chess_rank=["king","car","horse","cannon","knight","elephant","soldier"];
                
let chess_pieces=[
    "empty","empty","empty","empty","empty","empty","empty","empty",
    "empty","empty","empty","empty","empty","empty","empty","empty",
    "empty","empty","empty","empty","empty","empty","empty","empty",
    "empty","empty","empty","empty","empty","empty","empty","empty"
    ];
let chess_pieces_show=[
    "empty","empty","empty","empty","empty","empty","empty","empty",
    "empty","empty","empty","empty","empty","empty","empty","empty",
    "empty","empty","empty","empty","empty","empty","empty","empty",
    "empty","empty","empty","empty","empty","empty","empty","empty"
    ];
let chess_vis=[false,false,false,false,false,false,false,false,false,false,
               false,false,false,false,false,false,false,false,false,false,
               false,false,false,false,false,false,false,false,false,false,
               false,false];
var win=false;
for (var i =0;i<32;i++){
    var rand=Math.floor(Math.random() * (31-i));
    chess_pieces[i]=chess_type[rand];
    var temp=chess_type[rand];
    chess_type[rand]=chess_type[31-i];
    chess_type[31-i]=temp;
    chess_type.pop();
}

function validate(click1,click2){
    if (Math.abs(click1-click2)==1||Math.abs(click1-click2)==8){
        if (chess_pieces[click2]=="blank"){
            return true;
        }
        let chess_with_side=[];
        chess_with_side[0]=chess_pieces[click1].split("_");
        chess_with_side[1]=chess_pieces[click2].split("_");
        if (chess_with_side[0][1]=="soldier"&&chess_with_side[1][1]=="king"){
            
            return true;
        }
        if (chess_with_side[0][0]==chess_with_side[1][0]){
            return false;
        }
        if (chess_with_side[0][1]=="king"&&chess_with_side[1][1]=="soldier"){
            return false;
        }
        if (chess_rank.indexOf(chess_with_side[0][1])>chess_rank.indexOf(chess_with_side[1][1])){
            return false;
        }
        
        return true;
    } else {
        return false;
    }
}

function valid_side(click1){

    let chess_with_side=[];
    chess_with_side=chess_pieces[click1].split("_");
    var turn_color="";
    if (turn==1){
        turn_color="red";
    } else {
        turn_color="black"
    }
    if (chess_with_side[0]!=turn_color){
        return false;
    }
    return true;
}

function draw_new_chess(){
    for(var i in Player.list){
        var sockets = SOCKET_LIST[i];
        sockets.emit('board',chess_pieces_show);
    }
}
function draw_new_light(){
    for(var i in Player.list){
        var players = Player.list[i];
        var sockets = SOCKET_LIST[i];
        sockets.emit('light',players.click_1);
    }
}
function change_turn(){
    if (win==false){
        turn=turn%2+1;

        for(var i in Player.list){
            var sockets = SOCKET_LIST[i];
            sockets.emit('turn',turn);
            if (i==turn){
                sockets.emit('move',"");
            } else {
                sockets.emit('stop',"");
            }
        }
    }

}

var SOCKET_LIST = {};
var last_id=1;
var Player = function(id){
    var self={
        id:id,
        click_1:-1,
        click_2:-2
        
    }
    Player.list[id]=self;
    return self;
}
Player.list={};
var io = require('socket.io') (serv, {});

io.sockets.on('connection', function(socket){
    for (var i=1;i<=last_id;i++){
        if (SOCKET_LIST[i]==null){
            last_id=i;
            break;
        }
    }
    socket.id=last_id;
    Player(socket.id);
    SOCKET_LIST[socket.id]=socket;
    last_id++;
    while (SOCKET_LIST[last_id]!=null){
        last_id++;
    }


    if (socket.id==turn){
        socket.emit('move',"");
    } else {
        socket.emit('stop',"");
    }
    
    socket.on("disconnect",function(){
        delete SOCKET_LIST[socket.id];
        delete Player.list[socket.id];
        for(var i in Player.list){
            var sockets =  SOCKET_LIST[i];
            sockets.emit('player_leave',socket.id);
            sockets.emit('player_list',Player.list);
        }
        
    });
    
    
    socket.emit('info',socket.id);
    
    
    socket.on("chat_send",function(data){

        for(var i in Player.list){
            var sockets =  SOCKET_LIST[i];
            sockets.emit('chat_print',data);
        }
    });

    for(var i in Player.list){
        var sockets =  SOCKET_LIST[i];
        sockets.emit('player_join',socket.id);
        sockets.emit('player_list',Player.list);
    }

    
    
    socket.on('update',function(data){

        var player=Player.list[socket.id];
        if (chess_vis[data]==false){
            chess_vis[data]=true;
            player.click_1=-1;
            change_turn();
        } else if (!(player.click_1==-1 && chess_pieces_show[data]=="blank") && !(player.click_1==-1 && !valid_side(data))){       
            if (player.click_1==-1){
                player.click_1=data;
            } else if (player.click_1!=data){
                player.click_2=data;    
            } else{
                player.click_1=-1;
                player.click_2=-2;
                //player.click_1=data;
            }
            if (player.click_2!=-2 ){
                if (validate(player.click_1,player.click_2)){
                    chess_pieces[player.click_2]=chess_pieces[player.click_1];
                    chess_pieces[player.click_1]="blank";
                    player.click_1=-1;
                    player.click_2=-2;
                    change_turn();
                } else{
                    player.click_1=-1;
                    player.click_2=-2;
                }
            }               
        }
        for (var i=0;i<32;i++){
            if (chess_vis[i]){
                chess_pieces_show[i]=chess_pieces[i];
            }
        }  

        draw_new_chess();
        if (player.click1!=-1){
            draw_new_light();
        }
        if (!(chess_pieces.includes("red_king")&&chess_pieces.includes("black_king"))){
            change_turn();
            win=true;
            if(!chess_pieces.includes("red_king")){
                
                for(var i in Player.list){ 
                    var sockets = SOCKET_LIST[i];
                    sockets.emit('win',"Black");
                }
            } else {
                
                for(var i in Player.list){ 
                    var sockets = SOCKET_LIST[i];
                    sockets.emit('win',"Red");
                }
            }
        }
    });

    draw_new_chess();
    socket.emit('turn',turn);
    socket.emit('reset_win',win);
        
});





