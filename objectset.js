class ObjectSet {
    constructor(compare){
        this.compare = compare;
        this._list = [];
        this.size = 0;
    }
    has(obj) {
        for(let i = 0; i < this._list.length; i++){
            if(!this.compare(this._list[i], obj)){
                return true;
            }
        }
        return false;
    }
    add(obj) {
        if(!this.has(obj)){
            this._list.push(obj);
            this.size++;
            return true;
        }
        return false;
    }
    clear() {
        this._list = [];
        this.size = 0;
    }
    delete(obj) {
        for(let i = 0; i < this._list.length; i++){
            if(!this.compare(this._list[i], obj)){
                this._list.splice(i, 1);
                this.size--;
                return true;
            }
        }
        return false;
    }
    forEach(callBack) {
        for(let i = 0; i < this._list.length; i++){
            callBack(this._list[i]);
        }
    }
    [Symbol.iterator]() {
        let _idx = 0;
        return {
            next: () => {
                if(_idx < this._list.length){
                    return{value: this._list[_idx++], done: false};
                } else {
                    return {done: true};
                }
            }
        };
    }
}