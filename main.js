// Получение ссылок на элементы UI
let connectButton = document.getElementById('connect');
let disconnectButton = document.getElementById('disconnect');
let terminalContainer = document.getElementById('terminal');
let sendForm = document.getElementById('send-form');
let inputField = document.getElementById('input');
let startButton = document.getElementById('startBtn');
let fftStartButton = document.getElementById('fftStartBtn');
let fftSaveButton = document.getElementById('fftSaveBtn');
let stopButton = document.getElementById('stopBtn');
let clearButton = document.getElementById('clrBtn');
let attCheckbox = document.getElementById('attenuator');
let vibrospeedLabel = document.getElementById('vibrospeed');
let graphDiv = document.getElementById('div_v');
let graphLab = document.getElementById('labdiv');


var fftByteArray = new Uint16Array(4096);

var devicename = 'data' ;

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
	  devicename = device.name ;
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
        //log('GATT server connected, getting service...');
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
  terminalContainer.insertAdjacentHTML('beforeEnd',
      '<div' + (type ? ' class="' + type + '"' : '') + '>' + data + '</div>');
  //terminalContainer.scrollTop = terminalContainer.scrollHeight;
  //console.log(terminalContainer.scrollTop);
  //console.log(terminalContainer.scrollHeight);
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
  fftByteArray[block*9+1] = event.target.value.getUint16(1+2, true) ;
  fftByteArray[block*9+2] = event.target.value.getUint16(1+4, true) ;
  fftByteArray[block*9+3] = event.target.value.getUint16(1+6, true) ;
  fftByteArray[block*9+4] = event.target.value.getUint16(1+8, true) ;
  fftByteArray[block*9+5] = event.target.value.getUint16(1+10, true) ;
  fftByteArray[block*9+6] = event.target.value.getUint16(1+12, true) ;
  fftByteArray[block*9+7] = event.target.value.getUint16(1+14, true) ;
  fftByteArray[block*9+8] = event.target.value.getUint16(1+16, true) ;
  if(block == 75) {
    //log("fft " + block + ' ' + fftByteArray[0], 'in');
	datau = [] ;
	var freq ;
	for (let i=1;i<75*9;i+=1) { freq = (i*2*3600/4095) ; datau.push([freq, fftByteArray[i]]); }
	console.log(datau);
	ShowGrf();
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
  vibrospeedLabel.innerHTML =  event.target.value.getInt32(0)/100 ;
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

var stg = 0;
var datau = [];

function ShowGrf() {
	if(!stg) {
		gu = new Dygraph(
			graphDiv,
		    datau, //fftByteArray,
			{
				title: 'спектр ускорений',
				showRangeSelector: false, //true,
				showRoller: false, //true,
				xlabel: 'f(Hz)',
				ylabel: 'амплитуда',
				colors: ['green'],
				axes: {
					x: {valueFormatter: function(x){return this.getLabels()[0] + ': '+ x.toPrecision(5);}}},
					labels: ['Hz', 'A'],
					labelsDiv: graphLab,
					legend: "follow", //'always',  // "follow"
					digitsAfterDecimal: 3,
			});
//		setInterval(function(){renderChart()}, 50);
		stg = 1;
	} else {
		gu.updateOptions({'file': datau});
	}
}

var renderChart = function() {
	var dl;
	if (gu.dateWindow_) {
		dl = gu.dateWindow_[1] - gu.dateWindow_[0];
	    if ($("FixEnd").checked) {
			var ls = datau.length - 1;
			gu.dateWindow_[1] = datau[ls][0];
			gu.dateWindow_[0] = datau[ls][0] - dl;
		} else if (gu.dateWindow_[0] < datau[0][0]) {
			gu.dateWindow_[0] = datau[0][0];
			gu.dateWindow_[1] = datau[0][0] + dl;
	   	}
	} else dl = datau.length/smprate;
	if(rend && datau.length != 0) gu.updateOptions({'file': datau});
}

function convertArrayOfObjectsToCSV(value){
	var result, ctr, keys, columnDelimiter, lineDelimiter, data;

	data = value.data || null;
	if (data == null || !data.length) {return null;}
	columnDelimiter = value.columnDelimiter || ';';
	lineDelimiter = value.lineDelimiter || '\n';
	keys = Object.keys(data[1]);
	result = '';
	result += keys.join(columnDelimiter);
	result += lineDelimiter;
	data.forEach(function(item){
		ctr = 0;
		keys.forEach(function(key){
			if (ctr > 0)
				result += columnDelimiter;
			result += item[key].toFixed(3).replace(".",",");
			ctr++;
		});
		result += lineDelimiter;
	});
	return result;
}

// при нажатии на кнопку FFTSAVE
fftSaveButton.addEventListener('click', function() {
  log('fftsave to csv');
  var csv = convertArrayOfObjectsToCSV({data: datau});
  if (!csv.match(/^data:text\/csv/i)) {csv = 'data:text/csv;charset=utf-8,' + csv;}
  var encodedUri = encodeURI(csv);
  var link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download',devicename.replace("#","")+".csv");
  link.click();
});

