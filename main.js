// Получение ссылок на элементы UI
let connectButton = document.getElementById('connect');
let disconnectButton = document.getElementById('disconnect');
let terminalContainer = document.getElementById('terminal');
let sendForm = document.getElementById('send-form');
let inputField = document.getElementById('input');
let startButton = document.getElementById('startBtn');
let stopButton = document.getElementById('stopBtn');
let clearButton = document.getElementById('clrBtn');


// при нажатии на кнопку START
startButton.addEventListener('click', function() {
  log('start');
});

// при нажатии на кнопку STOP
stopButton.addEventListener('click', function() {
  log('stop');
});

// при нажатии на кнопку CLEAR
clearButton.addEventListener('click', function() {
  log('clear');
  terminalContainer.innerHTML = "";
});


// Записать значение в характеристику
function writeToCharacteristic(characteristic, data) {
  characteristic.writeValue(new TextEncoder().encode(data));
}

// Подключение к устройству при нажатии на кнопку Connect
connectButton.addEventListener('click', function() {
  connect();
});

// Отключение от устройства при нажатии на кнопку Disconnect
disconnectButton.addEventListener('click', function() {
  disconnect();
});

// Обработка события отправки формы
sendForm.addEventListener('submit', function(event) {
  event.preventDefault(); // Предотвратить отправку формы
  send(inputField.value); // Отправить содержимое текстового поля
//  inputField.value = '';  // Обнулить текстовое поле
  inputField.focus();     // Вернуть фокус на текстовое поле
});

// Кэш объекта выбранного устройства
let deviceCache = null;

// Запустить выбор Bluetooth устройства и подключиться к выбранному
function connect() {
  return (deviceCache
      ? Promise.resolve(deviceCache)
      : requestBluetoothDevice())
          .then(device => connectDeviceAndCacheCharacteristic(device))
          .then(characteristic => startNotifications(characteristic))
          .catch(error => log(error));
}

// Запрос выбора Bluetooth устройства
function requestBluetoothDevice() {
  log('Requesting bluetooth device...');

  return navigator.bluetooth.requestDevice({
//	  acceptAllDevices: true,
      filters: [
//	   {services: [0xAA81]}
	   {namePrefix: 'TAB4V'}
	  ],
	  optionalServices: [0xAA80, 0xAA64]
  }).
      then(device => {
        log('"' + device.name + '" bluetooth device selected');
        deviceCache = device;

        // Добавленная строка
        deviceCache.addEventListener('gattserverdisconnected',
            handleDisconnection);

        return deviceCache;
      });
}

// Обработчик разъединения
function handleDisconnection(event) {
  let device = event.target;

  log('"' + device.name + '" bluetooth device disconnected, trying to reconnect...');

  connectDeviceAndCacheCharacteristic(device).
      then(characteristic => startNotifications(characteristic)).
      catch(error => log(error));
}

// Кэш объекта характеристики
let characteristicCache = null;
let ioCharacteristicCache = null;
let serverInstance;

// Подключение к определенному устройству, получение сервиса и характеристики
function connectDeviceAndCacheCharacteristic(device) {
  if (device.gatt.connected && characteristicCache) {
    return Promise.resolve(characteristicCache);
  }

  log('Connecting to GATT server...');
  console.log('Connecting to GATT server...');

  return device.gatt.connect()
    .then(server => {
      log('GATT server connected, getting service...');
      console.log(['GATT server connected, getting service...', server]);
      serverInstance = server ;
      return server.getPrimaryService(0xAA80);
    }).
    then(service => {
      log('Service found, getting characteristic...');
      console.log(['Service found, getting characteristic...', service]);

      return service.getCharacteristic(0xAA81);
    }).
    then(characteristic => {
      log('Characteristic found');
      console.log(['Characteristic found', characteristic]);
      characteristicCache = characteristic;

      return characteristicCache;
    });
// 	   .then(_ => {
//         return serverInstance.getPrimaryService(0xAA64);
// 		log('getting service...');
// 		then(newService => {
// 			log('Service found, getting characteristic...');
// 			return newService.getCharacteristic(0xAA65);
// 		})
// 		.then(newCharacteristic => {
// 			log('Characteristic found');
// 			ioCharacteristicCache = newCharacteristic;
// //			return ioCharacteristicCache;
// 		})
//       });
}

// Включение получения уведомлений об изменении характеристики
function startNotifications(characteristic) {
  log('Starting notifications...');
  console.log(['Starting notifications...', characteristic]);

  return characteristic.startNotifications().
      then(() => {
        log('Notifications started');

        // Добавленная строка
        characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);		
      });
}

// Вывод в терминал
function log(data, type = '') {
  terminalContainer.insertAdjacentHTML('beforeend', '<div' + (type ? ' class="' + type + '"' : '') + '>' + data + '</div>');
}

// Отключиться от подключенного устройства
function disconnect() {
  if (deviceCache) {
    log('Disconnecting from "' + deviceCache.name + '" bluetooth device...');
    console.log(['Disconnecting from "' + deviceCache.name + '" bluetooth device...', deviceCache]);
    deviceCache.removeEventListener('gattserverdisconnected', handleDisconnection);

    if (deviceCache.gatt.connected) {
      deviceCache.gatt.disconnect();
      log('"' + deviceCache.name + '" bluetooth device disconnected');
      console.log('"' + deviceCache.name + '" bluetooth device disconnected');
    }
    else {
      log('"' + deviceCache.name + '" bluetooth device is already disconnected');
      console.log('"' + deviceCache.name + '" bluetooth device is already disconnected');
    }
  }

  // Добавленное условие
  if (characteristicCache) {
    characteristicCache.removeEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
    characteristicCache = null;
  }
  
  deviceCache = null;
}

// Получение данных
function handleCharacteristicValueChanged(event) {
  log(event.target.value.getUint32(0)/100, 'in'); // (0, littleEndian)
  console.log([event.target.value.getUint32(0)/100, 'in', event]);
}

// Отправить данные подключенному устройству
function send(data) {
  data = String(data);

  if (!data || !characteristicCache) {
	log('err');
    return;
  }

  writeToCharacteristic(characteristicCache, data);
  log(data, 'out');
}
