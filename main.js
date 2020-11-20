// Получение ссылок на элементы UI
let connectButton = document.getElementById('connect');
let disconnectButton = document.getElementById('disconnect');
let terminalContainer = document.getElementById('terminal');
let sendForm = document.getElementById('send-form');
let inputField = document.getElementById('input');
let startButton = document.getElementById('startBtn');
let fftStartButton = document.getElementById('fftStartBtn');
let stopButton = document.getElementById('stopBtn');
let clearButton = document.getElementById('clrBtn');
let attCheckbox = document.getElementById('attenuator');
let fftCanvas = document.getElementById("fftCanvas");

fftCanvas.width = 300;
fftCanvas.height = 300;

var ctx = fftCanvas.getContext("2d");


https://code.tutsplus.com/ru/tutorials/how-to-draw-bar-charts-using-javascript-and-html5-canvas--cms-28561

function drawLine(ctx, startX, startY, endX, endY,color){
    ctx.save();
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(startX,startY);
    ctx.lineTo(endX,endY);
    ctx.stroke();
    ctx.restore();
}

function drawBar(ctx, upperLeftCornerX, upperLeftCornerY, width, height,color){
    ctx.save();
    ctx.fillStyle=color;
    ctx.fillRect(upperLeftCornerX,upperLeftCornerY,width,height);
    ctx.restore();
}

var myVinyls = {
    "Classical music": 10,
    "Alternative rock": 14,
    "Pop": 2,
    "Jazz": 12
};

var Barchart = function(options){
    this.options = options;
    this.canvas = options.canvas;
    this.ctx = this.canvas.getContext("2d");
    this.colors = options.colors;
  
    this.draw = function(){
        var maxValue = 0;
        for (var categ in this.options.data){
            maxValue = Math.max(maxValue,this.options.data[categ]);
        }
        var canvasActualHeight = this.canvas.height - this.options.padding * 2;
        var canvasActualWidth = this.canvas.width - this.options.padding * 2;
 
        //drawing the grid lines
        var gridValue = 0;
        while (gridValue <= maxValue){
            var gridY = canvasActualHeight * (1 - gridValue/maxValue) + this.options.padding;
            drawLine(
                this.ctx,
                0,
                gridY,
                this.canvas.width,
                gridY,
                this.options.gridColor
            );
             
            //writing grid markers
            this.ctx.save();
            this.ctx.fillStyle = this.options.gridColor;
            this.ctx.font = "bold 10px Arial";
            this.ctx.fillText(gridValue, 10,gridY - 2);
            this.ctx.restore();
 
            gridValue+=this.options.gridScale;
        }
  
        //drawing the bars
        var barIndex = 0;
        var numberOfBars = Object.keys(this.options.data).length;
        var barSize = (canvasActualWidth)/numberOfBars;
 
        for (categ in this.options.data){
            var val = this.options.data[categ];
            var barHeight = Math.round( canvasActualHeight * val/maxValue) ;
            drawBar(
                this.ctx,
                this.options.padding + barIndex * barSize,
                this.canvas.height - barHeight - this.options.padding,
                barSize,
                barHeight,
                this.colors[barIndex%this.colors.length]
            );
 
            barIndex++;
        }
  
    }
}

var myBarchart = new Barchart(
    {
        canvas:fftCanvas,
        padding:10,
        gridScale:5,
        gridColor:"#eeeeee",
        data:myVinyls,
        colors:["#a55ca5","#67b6c7", "#bccd7a","#eb9743"]
    }
);

myBarchart.draw();

// при нажатии на кнопку START
startButton.addEventListener('click', function() {
  log('start');
  var uuid = $('#startBtn').attr('data-uuid');
  var value = 0x01 ; // $('#startBtn').attr('data-value');
  if (!$('#attenuator').is(':checked')){
    value |= 0x40 ;
	log('ATT Выключен');
  } 
  if ($('#once').is(':checked')){
    value |= 0x20 ;
	log('однократно');
  } 
  var characteristic = charArray[uuid].characteristic;
  var converted = new Uint16Array([value]);
  characteristic.writeValue(converted);
});

// при нажатии на кнопку FFTSTART
fftStartButton.addEventListener('click', function() {
  log('fftstart');
  var uuid = $('#startBtn').attr('data-uuid');
  var value = 0x81 ; // $('#startBtn').attr('data-value');
  if (!$('#attenuator').is(':checked')){
    value |= 0x40 ;
	log('ATT Выключен');
  } 
  if ($('#once').is(':checked')){
    value |= 0x20 ;
	log('однократно');
  } 
  var characteristic = charArray[uuid].characteristic;
  var converted = new Uint16Array([value]);
  characteristic.writeValue(converted);
});

// при нажатии на кнопку STOP
stopButton.addEventListener('click', function() {
  log('stop');
  var uuid = $('#stopBtn').attr('data-uuid');
  var value = $('#stopBtn').attr('data-value');
  var characteristic = charArray[uuid].characteristic;
  var converted = new Uint16Array([value]);
  characteristic.writeValue(converted);
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
  send();
  log("send " + inputField.value, 'out');
  // send(inputField.value); // Отправить содержимое текстового поля
//  inputField.value = '';  // Обнулить текстовое поле
  inputField.focus();     // Вернуть фокус на текстовое поле
});

// Кэш объекта выбранного устройства
let deviceCache = null;

let coefficientValueCharacteristic = null;
let fftCharacteristic = null;


// Запустить выбор Bluetooth устройства и подключиться к выбранному
function connect() {
  var _dev = (deviceCache ? Promise.resolve(deviceCache) : requestBluetoothDevice());
  _dev.then(device => showValues(device));
  return _dev
    .then(device => connectDeviceAndCacheCharacteristic(device))
    .then(characteristic => startNotifications(characteristic))
	.then(_ => {
    log('Readingcoefficient ...');
    return coefficientValueCharacteristic.readValue();
  })
    .catch(error => log(error));
}

// Запрос выбора Bluetooth устройства
function requestBluetoothDevice() {
  log('Requesting bluetooth device...');

  return navigator.bluetooth.requestDevice({
	  // acceptAllDevices: true,
    filters: [
	   // {services: [0xAA81]}
	   {namePrefix: 'AB4'}
	  ],
	  optionalServices: [0xAA80, 0xAA64]
  }).then(device => {
      log('"' + device.name + '" bluetooth device selected');
      deviceCache = device;

      // Добавленная строка
      deviceCache.addEventListener('gattserverdisconnected', handleDisconnection);

      return deviceCache;
    });
}

// Обработчик разъединения
function handleDisconnection(event) {
  let device = event.target;

  log('"' + device.name + '" bluetooth device disconnected, trying to reconnect...');

  connectDeviceAndCacheCharacteristic(device)
    .then(characteristic => startNotifications(characteristic))
    .catch(error => log(error));
}

// Кэш объекта характеристики
let characteristicCache = null;
let charArray = null;
// let ioCharacteristicCache = null;
let serviceInstance = null;

function getPrimaryService(device) {
  return serviceInstance
    ? Promise.resolve(serviceInstance)
    : device.gatt.connect()
      .then(server => {
        log('GATT server connected, getting service...');
        serviceInstance = server ;
        return server.getPrimaryService(0xAA80);
      });
}

function readCharacteristic(device, param) {
  return getPrimaryService(device)
    .then(service => {
      return service.getCharacteristic(param);
    });
}

function showValues(device) {
  var chars = [0xAA81, 0xAA82, 0xAA84, 0xAA85];
  if (!charArray) {
    for (var i in chars) {
      readCharacteristic(device, chars[i])
        .then(characteristic => {
          if (!charArray) {
            charArray = {};
          }
          var uuid = characteristic.uuid;
          //if(uuid == '0000aa84-0000-1000-8000-00805f9b34fb') Promise.resolve(characteristic.readValue()) 
			Promise.resolve(0)
            .then(value => {
              var _val;
              var _dat;
              switch(uuid) {
                case '0000aa81-0000-1000-8000-00805f9b34fb':
                  _val = 0 ; // value.getUint32(0);
                  _dat = 'uint32';
                  break;
                case '0000aa82-0000-1000-8000-00805f9b34fb':
                  _val = 0 ; // value.getUint8(0);
                  $('#startBtn')
                    .attr('data-uuid', uuid)
                    .attr('data-value', 1);
                  $('#stopBtn')
                    .attr('data-uuid', uuid)
                    .attr('data-value', 0);
                  _dat = 'uint16';
                  break;
                case '0000aa84-0000-1000-8000-00805f9b34fb':
				  coefficientValueCharacteristic = characteristic;
				  coefficientValueCharacteristic.addEventListener('characteristicvaluechanged', handleCoefficientValueChanged);
				  
                  _val  = 0 ; // value.getInt16(0); ; // = 0 ; // = value.getInt16(0);
                  _dat = 'int16';
                  $('#input').attr('data-uuid', uuid);
                  $('#input').val(_val);
                  break;
                case '0000aa85-0000-1000-8000-00805f9b34fb':
				  fftCharacteristic = characteristic;
				  fftCharacteristic.addEventListener('characteristicvaluechanged', handleFftChanged);
				  fftCharacteristic.startNotifications();
                  _val  = 0 ;
                  _dat = 'int16';
                  break;
              }
              charArray[uuid] = {
                characteristic: characteristic,
                value: _val,
                data: _dat
              };
			  log(uuid + ': ' + _val);
            });
        });
    }
  }
}

// Подключение к определенному устройству, получение сервиса и характеристики
function connectDeviceAndCacheCharacteristic(device) {
  if (device.gatt.connected && characteristicCache) {
    return Promise.resolve(characteristicCache);
  }

  log('Connecting to GATT server...');

  // return device.gatt.connect()
  //   .then(server => {
  //     log('GATT server connected, getting service...');
  //     serviceInstance = server ;
  //     return server.getPrimaryService(0xAA80);
  //   })
  return getPrimaryService(device)
    .then(service => {
      log('Service found, getting characteristic...');

      return service.getCharacteristic(0xAA81);
    })
    .then(characteristic => {
      log('Characteristic found');
      characteristicCache = characteristic;

      return characteristicCache;
    });
// 	   .then(_ => {
//         return serviceInstance.getPrimaryService(0xAA64);
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

  return characteristic.startNotifications().
      then(() => {
        log('Notifications started');

        // Добавленная строка
        characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);	
      });
}

// Вывод в терминал
function log(data, type = '') {
  terminalContainer.insertAdjacentHTML('beforeend',
      '<div' + (type ? ' class="' + type + '"' : '') + '>' + data + '</div>');
}

// Отключиться от подключенного устройства
function disconnect() {
  if (deviceCache) {
    log('Disconnecting from "' + deviceCache.name + '" bluetooth device...');
    deviceCache.removeEventListener('gattserverdisconnected',
        handleDisconnection);

    if (deviceCache.gatt.connected) {
      deviceCache.gatt.disconnect();
      log('"' + deviceCache.name + '" bluetooth device disconnected');
    }
    else {
      log('"' + deviceCache.name +
          '" bluetooth device is already disconnected');
    }
  }

  // Добавленное условие
  if (characteristicCache) {
    characteristicCache.removeEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
    characteristicCache = null;
  }

  charArray = null;
  serviceInstance = null;
  deviceCache = null;
}


// Получение fft data
function handleFftChanged(event) {
  var block = event.target.value.getUint8(0) ;
  fftByteArray[block*9+0] = event.target.value.getUint16(1+0, true) ;
  fftByteArray[block*9+1] = event.target.value.getUint16(1+1, true) ;
  fftByteArray[block*9+2] = event.target.value.getUint16(1+2, true) ;
  fftByteArray[block*9+3] = event.target.value.getUint16(1+3, true) ;
  fftByteArray[block*9+4] = event.target.value.getUint16(1+4, true) ;
  fftByteArray[block*9+5] = event.target.value.getUint16(1+5, true) ;
  fftByteArray[block*9+6] = event.target.value.getUint16(1+6, true) ;
  fftByteArray[block*9+7] = event.target.value.getUint16(1+7, true) ;
  fftByteArray[block*9+8] = event.target.value.getUint16(1+8, true) ;
  if(block == 75) {
    log("fft " + block + ' ' + fftByteArray[0], 'in');
  }

}

// Получение коэффициента
function handleCoefficientValueChanged(event) {
  log("coefficient " + event.target.value.getInt16(0), 'in'); // (0, littleEndian)
  inputField.value = event.target.value.getInt16(0) ;
}

// Получение данных
function handleCharacteristicValueChanged(event) {
  log(event.target.value.getInt32(0)/100, 'in'); // (0, littleEndian)
}

function int16ToInt8Array(value) {
    // we want to represent the input as a 8-bytes array
    var byteArray = [(value >> 8) & 0xFF, value & 0xFF];

    // for (var index = 0; index < byteArray.length; index++) {
      // var byte = value & 0xff;
      // byteArray[index] = byte;
      // value = (value - byte) / 256;
    // }

    return new Int8Array(byteArray);
};

// Отправить данные подключенному устройству
function send() {
  var uuid = $('#input').attr('data-uuid');
  var value = $('#input').val();
  var characteristic = charArray[uuid].characteristic;
  var converted = int16ToInt8Array(value);
  characteristic.writeValue(converted);
}
/*
function send(data) {
  data = String(data);

  if (!data || !characteristicCache) {
	  log('err');
    return;
  }

  writeToCharacteristic(characteristicCache, data);
  log(data, 'out');
}
*/