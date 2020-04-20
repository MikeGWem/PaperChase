const twoPi = Math.PI * 2;
function only360(angle) {
    angle %= twoPi;
    while(angle < 0) {angle += twoPi;}
    return angle;
}
Math.seed = function(s) {
    return function() {
        s = Math.sin(s) * 10000; 
        return s - Math.floor(s);
    };
};
function posMatch(p1, p2){
    if(!p1 || !p2){return false;}
    return (p1.x === p2.x && p1.y === p2.y);
}
function compareCells(a,b){
    return (a.x === b.x && a.y === b.y) ? 0 : 1;
}
function getAngleIndex4(val){
    const l1 = [0.5,1,1.5,0];
    let l2 = [0,0.5,1,1.5];
    let angle = l2.sort( (a, b) => Math.abs(val - a) - Math.abs(val - b) )[0];
    return l1.indexOf(angle); // returns 0 to 3
}
function findPointOnCircle(circ, angleRadians) {
    let circX = circ.radius * Math.cos(angleRadians) + circ.pos.x;
    let circY = circ.radius * Math.sin(angleRadians) + circ.pos.y;
    return new Point(circX, circY);
}
function circIntersect(c1, c2){     
    // one could be inside the other but thats OK
    let dist = Math.hypot(c1.pos.x-c2.pos.x,c1.pos.y-c2.pos.y);
    return dist <= c1.radius+c2.radius;
}
function isPointInRect(pt, rect){
    return pt.x >= rect.x && pt.x <= rect.x + rect.width && pt.y >= rect.y && pt.y <= rect.y + rect.height;
}
function lineIntersectsRect(lStart, lEnd, rect) {
	let minX = lStart.x;
    let maxX = lEnd.x;
    if(lEnd.x < lStart.x) {
			maxX = lStart.x;
			minX = lEnd.x;
	}
	maxX = Math.min(maxX, rect.x + rect.width);
	minX = Math.max(minX, rect.x);
	if(minX > maxX) {return false;}
	let minY = lStart.y;
	let maxY = lEnd.y;
	let dx = lEnd.x - lStart.x;
	if(dx) { // there is a slope
		let a = (lEnd.y - lStart.y)/dx;
		let b = lStart.y - a * lStart.x;
		minY = a * minX + b;
		maxY = a * maxX + b;
	}
	if(minY > maxY) {
		[minY, maxY] = [maxY, minY]; // ES6 Destructuring Assignment swaps values
    }
    if(Math.max(minY, rect.y) > Math.min(maxY, rect.y + rect.height)){
        return false;
    }
	return true;
}
var game = {
    fox: null,
    trail: new LinkedList(),
    trailLength: 400,
    sprites: [],
    showTrail: true,
    showHuntType: true,
    rand: Math.seed(Date.now()),
    tmr: null
};
var view = {
    width: 800,
    height: 600,
    canvas: null,
    ctx: null,
    init: function() {
        this.canvas = document.getElementById("cvView");
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    },
    render: function() {
        this.ctx.clearRect(0,0,this.width,this.height);
        //sort sprites into y coordinate order to render notional back to front
        game.sprites.sort((a,b)=>a.pos.y-b.pos.y);
        for(let i = 0; i < game.sprites.length;i++){
            game.sprites[i].render(this.ctx);
        }
        if(game.showTrail){
            this.ctx.beginPath();
            this.ctx.fillStyle = "green";
            for(let t of game.trail){
                this.ctx.fillRect(t.data.x, t.data.y, 1, 1);
            }
            this.ctx.closePath();
        }
    }
};

var Point = function(x,y){
    this.x = x;
    this.y = y;
};
var Sprite = function(pos,imgSrc) {
    this.pos = pos;
    this.visible = false;
    this.img = new Image();
    let self = this;
    this.img.onload =
        function() {
            self.visible = true;
        };
    this.img.src = imgSrc;
};
Sprite.prototype.getCircle = function() {
    return {pos: this.pos, radius: Math.floor(this.img.width/2)};
};
Sprite.prototype.getCollisionRect = function() {
    // arbitrary rect to get collision looking reasonable in this view
    let h = Math.ceil(this.img.height / 5);
    return {x: Math.floor(this.pos.x-this.img.width/2), y: this.pos.y-h, width: this.img.width, height: h};
};
Sprite.prototype.render = function(ctx) {
    if(!this.visible){return;}
    let x = Math.floor(this.pos.x - this.img.width / 2);
    let y = this.pos.y - this.img.height;
    ctx.drawImage(this.img,x,y);
};
var Actor = function(pos,imgSrc,frameWidth){
    Sprite.call(this,pos,imgSrc);
    this.frameWidth = frameWidth;
    this.frame = 0;
    this.speed = 1;
    this.showTellTale = false;
    this.colour = null;
    this.lastPos = null;
    this.blocked = false;
    this.turn = this.rotation = this.forward = 0;
};
Actor.prototype.getCircle = function() {
    return {pos: {x: this.pos.x, y: this.pos.y}, radius: Math.floor(this.frameWidth/2)};
};

Actor.prototype.render = function(ctx) {
    if(!this.visible){return;}
    if(this.colour && game.showHuntType){
        let c = this.getCircle();
        ctx.beginPath();
        ctx.fillStyle = this.colour; // indicate hound chase mode
        ctx.arc(c.pos.x, c.pos.y, c.radius, 0, Math.PI*2);
        ctx.fill();
        ctx.closePath();
    }
    let x = Math.floor(this.pos.x - this.frameWidth / 2);
    let y = this.pos.y - this.img.height;
    ctx.drawImage(this.img,this.frame * this.frameWidth,0,this.frameWidth, this.img.height,x,y,this.frameWidth,this.img.height);
    if(this.showTellTale){
        let c = this.getCircle();
        let pt = findPointOnCircle(c, this.rotation);
        ctx.beginPath();
        ctx.moveTo(c.pos.x, c.pos.y);
        ctx.strokeStyle = "red";
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke(); // add a tiny line pointing forward
        ctx.closePath();
    }
    this.animate();
};
Actor.prototype.getIntegerPosition = function() {
    return new Point(Math.floor(this.pos.x), Math.floor(this.pos.y));
};
Actor.prototype.animate = function() {
    let newPos = this.getDirections(); // no action for fox/hare
    // we will use (rotation + forward) or newPos depending on what we get
    if(this.turn){
        this.rotation = only360(this.rotation + this.turn * this.rotSpeed);
    }
    // given rotation what face should we show?
    this.frame = getAngleIndex4(this.rotation/Math.PI);
    if(this.forward){
        let howFar = this.forward * this.speed;
        newPos = new Point(this.pos.x + Math.cos(this.rotation) * howFar, 
            this.pos.y + Math.sin(this.rotation) * howFar);
    }
    if(newPos){
        this.collisionDetect(newPos);
        if(!posMatch(this.pos, newPos)){
            this.lastPos = this.getIntegerPosition();
            this.pos = newPos;
            this.blocked = false;
        } else {this.blocked = true;}
        this.update();
    }    
};
Actor.prototype.collisionDetect = function(newPos){
    let c = this.getCircle();
    c.pos.x = newPos.x;
    c.pos.y = newPos.y;
    let p = this.pos;
    // detect colision with border and slide along edges
    if(newPos.x - c.radius < 0 || newPos.x + c.radius > view.width){
        newPos.x = p.x;
    }
    if(newPos.y + c.radius > view.height || newPos.y - this.img.height < 0){
        newPos.y = p.y;
    }
    // detect collision with other sprites
    for(let i = 0; i < game.sprites.length; i++){
        let s = game.sprites[i].getCircle();
        if(posMatch(s.pos, p)){continue;} // same sprite so skip
        if(game.sprites[i] instanceof Sprite){
            let rect = game.sprites[i].getCollisionRect();
            if(isPointInRect(newPos, rect)){ // use rectangle for static sprites
                newPos.x = p.x;
                newPos.y = p.y;
                break;
            }
        } else if(circIntersect(c, s)){
            newPos.x = p.x;
            newPos.y = p.y;
            break;
        }
    }
};
Actor.prototype.update = function(){}; // default empty method
Actor.prototype.getDirections = function() {}; // empty again
var Hound = function(pos,imgSrc,frameWidth){
    Actor.call(this,pos,imgSrc,frameWidth);
    this.target = null; // target location node from fox trail
    this.blockedCount = 0;
    this.nose = new ObjectSet(compareCells);
};
Hound.prototype = Object.create(Actor.prototype); // inherit Actor prototype methods
Hound.prototype.canSeePoint = function(pos){
    let dx = pos.x - this.pos.x;
    let dy = pos.y - this.pos.y;
    let angle = Math.atan2(dy, dx); // angle to pos
    for(let i = 0; i < game.sprites.length; i++){
        if(game.sprites[i] instanceof Sprite){
            let cr = game.sprites[i].getCollisionRect();
            if(lineIntersectsRect(this.pos, pos, cr)){
                return false;
            }
        }
    }
    this.rotation = only360(angle); // set rotation if pos visible
    return true;
};
Hound.prototype.canSeeFox = function() {
    let c = game.fox.getCircle();
    return this.canSeePoint(c.pos);
};
Hound.prototype.locateTrail = function() {
    // get most recent node in trail. If visible go for it
    // if blocked walk list history to find a visible element
    if(game.trail.count > 0){
        let tp = game.trail.getLast(); // most recent fox position
        while(tp){
            if(this.canSeePoint(tp.data)){
                return tp;
            }
            tp = tp.previous; // track backwards to find visible trail
        }
    }
    return null;
};

var hunting = {
    castAbout: function(){
        this.forward = 0; // as this routine returns next position
        this.colour = hunting.colours[0];
        if(this.canSeeFox()){
            this.forward = 1; // could move this code to canSeeFox
            this.getDirections = hunting.pursue;
            return null;
        }
        this.target = this.locateTrail();
        if(this.target){
            this.getDirections = hunting.findTrail;
            return null;
        }
        let possibles = [];
        this.nose.add(this.getIntegerPosition());
        
        for(let r = Math.floor(this.pos.y-1), r2 = Math.floor(this.pos.y+1); r <= r2; r++){
            for(let c = Math.floor(this.pos.x-1), c2 = Math.floor(this.pos.x+1); c <= c2; c++){
                let p = new Point(c, r);
                if(!this.nose.has(p)){
                    possibles.push(p);
                }
            }
        }
        if(possibles.length){
            return possibles[Math.floor(game.rand() * possibles.length)];
        } else {this.nose.clear();}
    },
    findTrail: function() {
        if(this.canSeeFox()){
            this.forward = 1; // as above
            this.getDirections = hunting.pursue;
            this.target = null;
            return null;
        }
        this.colour = hunting.colours[1];
        if(!this.target){
            this.target = this.locateTrail();
            if(!this.target){
                this.nose.clear();
                this.getDirections = hunting.castAbout;
                return null;
            }
        }
        if(this.blocked){
            this.blockedCount++;
            if(this.blockedCount === 3){
                this.blockedCount = 0;
                this.nose.clear();
                this.getDirections = hunting.castAbout;
                return null;
            }
        }
        // are we nearly there yet?
        if(closeMatch(this.target.data, this.getIntegerPosition())){
            //close enough so switch to following trail
            this.getDirections = hunting.followTrail;
            this.forward = 0;
            return this.target.data;
        }
        this.forward = 1;
        function closeMatch(p1, p2){ // function with local scope
            dx = Math.abs(p1.x - p2.x);
            dy = Math.abs(p1.y - p2.y);
            return (dy<=2 && dx<=2);
        }
    },
    followTrail: function() {
        // follow trail until fox visible then pursue
        if(this.canSeeFox()){
            this.forward = 1; // as above
            this.getDirections = hunting.pursue;
            this.target = null;
            return null;
        }
        this.colour = hunting.colours[2];
        this.target = this.target.next; // get next trail node
        if(this.target){
            return this.target.data; // next step on trail
        }
        this.nose.clear();
        this.getDirections = hunting.castAbout;
        return null;
    },
    pursue: function() {
        // while fox visible. If fox hides then findTrail
        if(!this.canSeeFox()){
            this.forward = 0;
            this.getDirections = hunting.findTrail;
            return null;
        }
        this.colour = hunting.colours[3];
    },
    colours: ["powderBlue", "olive", "sandyBrown", "firebrick"]
};

function keyDown(e) {
    switch(e.keyCode){
        case 38: game.fox.forward = 1; break; // up
        case 37: game.fox.turn = -1; break; //left
        case 39: game.fox.turn = 1; break; // right
    }
}
function keyUp(e) {
    switch(e.keyCode){
        case 38: game.fox.forward = 0; break;
        case 37:
        case 39: game.fox.turn = 0; break;
    }
}

function createSprites() {
    let p = new Point(165,118);
    let s = new Sprite(p, "images/bush.png");
    game.sprites.push(s);
    p = new Point(352,278);
    s = new Sprite(p, "images/rock.png");
    game.sprites.push(s);
    p = new Point(135,435);
    s = new Sprite(p, "images/rock.png");
    game.sprites.push(s);
    p = new Point(394,295);
    s = new Sprite(p, "images/tree.png");
    game.sprites.push(s);
    p = new Point(613,400);
    s = new Sprite(p, "images/rock.png");
    game.sprites.push(s);
    p = new Point(355,439);
    s = new Sprite(p, "images/bush.png");
    game.sprites.push(s);
    p = new Point(417,455);
    s = new Sprite(p, "images/bush.png");
    game.sprites.push(s);
    p = new Point(81,326);
    s = new Sprite(p, "images/rock.png");
    game.sprites.push(s);
    p = new Point(102,284);
    s = new Sprite(p, "images/rock.png");
    game.sprites.push(s);

}
function createHounds() {
    for(let h = 0; h < 3; h++){
        let p = new Point(view.width - 40, (view.height / 8) * h + view.height / 8);
        let nh = new Hound(p, "images/Guard4x21x32.png", 21);
        nh.rotation = Math.PI;
        nh.getDirections = hunting.castAbout;
        game.sprites.push(nh);
    }
}
function createFox() {
    let pos = new Point(16,105); // testing start behind bush
    game.fox = new Actor(pos,"images/Hero4X16x32.png",16);
    game.fox.rotSpeed = 2 * Math.PI / 180;
    game.fox.rotation = Math.PI/2; // face forward
    game.fox.speed = 1.75; // a little edge
    game.fox.showTellTale = true;
    game.fox.update = function(){
        let lp = game.trail.getLast();
        if(!lp || !posMatch(lp.data, this.lastPos)) {
            game.trail.push(this.lastPos);
            if(game.trail.count > game.trailLength){game.trail.shift();}
        } // don't add to trail if no movement
     };
    game.sprites.push(game.fox);
}
function initialise() {
    view.init();
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    createSprites();
    createFox();
    createHounds();
    game.tmr = setInterval(function(){view.render();}, 10); // avoids problem with this
}
initialise();