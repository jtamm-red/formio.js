const uuidv4 = require('uuid/v4');

const indexeddb = () => ({
  title: 'indexedDB',
  name: 'indexeddb',
  uploadFile(file, fileName, dir, progressCallback, url, options) {
    if (!('indexedDB' in window)) {
      console.log('This browser doesn\'t support IndexedDB');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(options.indexeddb, 3);
      request.onsuccess = function(event) {
        const db = event.target.result;
        resolve(db);
      };
      request.onupgradeneeded = function(e) {
        const db = e.target.result;
        db.createObjectStore(options.indexeddbTable);
      };
    }).then((db) => {
      const reader = new FileReader();

      return new Promise((resolve, reject) => {
        reader.onload = (event) => {
          const blobObject = new Blob([file], { type: file.type });

          const id = uuidv4(blobObject);
          const trans = db.transaction([options.indexeddbTable], 'readwrite');
          const addReq = trans.objectStore(options.indexeddbTable).put(blobObject, id);

          addReq.onerror = function(e) {
            console.log('error storing data');
            console.error(e);
          };

          trans.oncomplete = function(e) {
            resolve({
              storage: 'indexeddb',
              name: fileName,
              size: file.size,
              id,
            });
          };
        };

        reader.onerror = () => {
          return reject(this);
        };

        reader.readAsDataURL(file);
      });
    });
  },
  downloadFile(file, options) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(options.indexeddb, 3);

      request.onsuccess = function(event) {
        const db = event.target.result;
        resolve(db);
      };
    }).then((db) => {
      return new Promise((resolve, reject) => {
        const trans = db.transaction([options.indexeddbTable], 'readonly');
        const store = trans.objectStore(options.indexeddbTable).get(file.id);
        store.onsuccess = () => {
          trans.oncomplete = (e) => {
            const dbFile = new File([store.result], file.name, {
              type: store.result.type,
            });
            dbFile.originalName = file.originalName;
            dbFile.storage = file.storage;
            resolve(dbFile);
          };
        };
        store.onerror = () => {
          return reject(this);
        };
      });
    });
  }
});

indexeddb.title = 'IndexedDB';
export default indexeddb;
