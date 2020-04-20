class Node {
    constructor(data){
        this.data = data;
        this.next = this.previous = null;
    }
}
class LinkedList {
    constructor(){
        this.head = null;
        this.tail = null;
        this.count = 0;
    }
    [Symbol.iterator]() {
        let n = this.head;
        return {
            next: ()=>{
               if(n){
                    let r = n;
                    n = n.next;
                    return {value: r, done: false};
               } else {
                  return {done: true}; 
               }
            }
        };
    }
}
LinkedList.prototype.push = function(data){
    let nNode = new Node(data);
    if(!this.head){
        this.head = this.tail = nNode;
    } else {
        this.tail.next = nNode;
        nNode.previous = this.tail;
        this.tail = nNode;
    }
    this.count++;
};
LinkedList.prototype.shift = function(){
    switch(this.count){
        case 0:
            return;
        case 1:
            this.head = this.tail = null;
            break;
        default:
            let next = this.head.next;
            next.previous = null;
            this.head = next;
    }
    this.count--;
};
LinkedList.prototype.getLast = function(){
    return this.tail;
};
LinkedList.prototype.deleteList = function(){
    this.head = this.tail = null;
    this.count = 0;
};
