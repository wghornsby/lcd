var MyClient = new CrosswordClient('MyServer');
//
class CrosswordClient extends LocalClient {
  //
  getCrossword(id, onsuccess) {
    this.ajax_get('getCrossword', id, onsuccess);
  }
}