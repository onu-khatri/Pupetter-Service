export class Node<T> {
  constructor(public data: T, public next: Node<T> | undefined = undefined) {
  }

  hasNext() {
    return !!this.next;
  }

  getNext() {
    return this.next;
  }
}

export class LinkedList<T> {
  size = 0;

  constructor(public head: Node<T> | undefined = undefined) {
  }

  [Symbol.iterator]() {
    let currentNode = this.head;

    return {
      next(){
        if(!currentNode) return {value: undefined, done: true}
        const returnValue = {
          value: currentNode.data,
          done: false
        };
        currentNode = currentNode.next;
        return returnValue;
      }
    }
  }

  appendNode(newNode: Node<T>): void {
    let node = this.head;
    if (!node) {
      //Means it's just empty list
      this.head = newNode;
      this.size++;
      return;
    }
    while (node?.next) {
      node = node.next;
    }

    if (node) {
      node.next = newNode;
      this.size++;
    }
  }

  insertFirst(newNode: Node<T>): void {
    this.insertAt(0, newNode);
  }

  public insertAtEnd(data: T): Node<T> {
    const node = new Node(data);
    if (!this.head) {
      this.head = node;
      this.size++;
    } else {
      const lastNode = this.getLast();
      if (lastNode) {
        lastNode.next = node;
        this.size++;
      }
    }
    return node;
  }

  isEmpty() {
    return (!this.head)
  }

  insertAt(index: number, newNode: Node<T>): void {
    let node = this.head;

    if (index == 0) {
      newNode.next = node;
      this.head = newNode;
      this.size++;
      return;
    }

    while (--index) {
      if (node?.next)
        node = node?.next;
      else
        throw Error("Index Out of Bound");
    }

    let tempVal = node?.next;
    if (node)
      node.next = newNode;

    newNode.next = tempVal;
    this.size++;
  }

  removeFrom(index: number) {
    let node = this.head;
    if(!node || index < 0)
      return;

    if (index === 0) {
        this.head = node.next;
        this.size--;  

      return;
    }

    const previous = this.getNode(index-1);

    if (previous && previous.next) {
      previous.next = previous.next.next;
      this.size--;
    }
  }

  listSize(): number {
    let size = 0;
    let node = this.head;
    while (node) {
      size++;
      node = node.next;
    }
    return size;
  }

  getFirst(): Node<T> | undefined {
    return this.head;
  }

  getLast(): Node<T> | undefined {
    let lastNode = this.head;
    if (lastNode) {
      while (lastNode?.next) {
        lastNode = lastNode.next;
      }
    }
    return lastNode;
  }

  getNode(index: number): Node<T> | undefined {
    let node = this.head;

    if (index == 0) {
      return this.head;
    }
    while (index--) {
      if (node?.next)
        node = node?.next;
      else
        throw Error("Index Out of Bound");
    }
    return node;
  }

  clear(): void {
    this.head = undefined;
    this.size = 0;
  }

  delete(func: (data: T) => boolean): void {
    const indexToDelete = this.indexOf(func);

    if (indexToDelete > -1) {
      this.removeFrom(indexToDelete);
    }
  }

  indexOf(func: (data: T) => boolean): number {
    let ind = -1;
    let node = this.head;
    while (node) {
      ++ind;
      if (func(node.data)) return ind;

      node = node.next;
    }
    return -1;
  }

 toArray(): Array<T> {
  let len = this.listSize(); 
  
    // Create an array of the 
    // required length 
    let arr = new Array(len); 
      
    let index = 0; 
    var curr = this.head; 

    // Traverse the Linked List and add the 
    // elements to the array one by one 
    while (curr) 
    { 
        arr[index++] = curr.data; 
        curr = curr.next; 
    }

    return arr;
 } 
}