var app = {
	
	loadingScreen: function(v) {
		if (v) {
			document.getElementById('loadingDiv').style.display = 'table';
		} else {
			document.getElementById('loadingDiv').style.display = 'none';
		}
	},
	
	reloadStylesheet: function() {
		var dt = new Date().getTime();
		var stylesheetUrlNoCache = 'http://kiosk.dakjr.com/assets/css/identify.css?nc=' + dt;
		document.getElementById('pageMainStyle').setAttribute('href',stylesheetUrlNoCache);
	},
	
	getConnection: function() {
		
		var s = "";
		if (navigator.connection) {
			
			// detect network settings (ensure connection is available)
			var networkState = navigator.connection.type;
			var states = {};
			states[Connection.UNKNOWN] = "Unknown connection";
			states[Connection.ETHERNET] = "Ethernet connection";
			states[Connection.WIFI] = "Wifi connection";
			states[Connection.CELL_2G] = "Cell 2G connection";
			states[Connection.CELL_3G] = "Cell 3G connection";
			states[Connection.CELL_4G] = "Cell 4G connection";
			states[Connection.CELL] = "Cell generic connection";
			states[Connection.NONE] = "No network connection";
			globalNetworkState = networkState;
			s = states[networkState];
			displayPush('Network: ' + s);
			
			// wake lock
			app.doWakeLock();
			
		} else {
			
			// network unavailable
			globalNetworkState = "NONE";
			displayPush('Network: UNAVAILABLE');
			
		}
		
	},
	
	doWakeLock: function() {
		window.powerManagement.acquire(
			function() {
				displayPush('Wakelock acquired');
			}, function() {
				displayPush('Wakelock failed');
			}
		);
		app.doBatteryChecker();
	},
	
	doBatteryChecker: function() {
		window.addEventListener("batterystatus", onBatteryStatus, false);
		app.doMainScreen();
	},
	
	doMainScreen: function() {
		
		app.reloadStylesheet();
		displayPush('Reloaded Stylesheet');
		
		document.getElementById('classroomOptionsDiv').style.display = 'block';
		document.getElementById('classroomConfirmDiv').style.display = 'none';
		document.getElementById('scrollerDiv').style.display = 'none';
		
		// figure out classroom options
		var jqxhr = $.getJSON("http://kiosk.dakjr.com/json/classrooms.php?callback=?", {
			uuid: globalDeviceUUID
		}, function(jsonp) {
			classroomList = jsonp.classroomList;
			containerDiv = document.getElementById('classroomOptionsDiv');
			containerDiv.innerHTML = '<br /><img src="http://kiosk.dakjr.com/assets/img/logo.png" id="logo" /><br /><br />';
			for (var i in classroomList) {
				classroomID = classroomList[i].classroomID;
				classroomName = classroomList[i].classroomName;
				var iDiv = document.createElement('div');
				iDiv.id = 'classroom_' + classroomID;
				iDiv.className = 'classroomOption';
				iDiv.onclick = (function() { 
					var currentClassroomID = classroomID;
					var currentClassroomName = classroomName;
					return function() {
						app.selectClassroom(currentClassroomID,currentClassroomName);
					}
				})();
				iDiv.innerHTML = classroomName;
				containerDiv.appendChild(iDiv);
			}	
		})
		.fail(function(e,f,g) {
			dummyVariable = -1;
			document.getElementById('classroomOptionsDiv').style.display = 'none';
			document.getElementById('classroomConfirmDiv').style.display = 'none';
			document.getElementById('scrollerDiv').style.display = 'none';
			document.getElementById('debugDiv').style.display = 'block';
			displayPush('No Classrooms Available');
		})
		
	},
	
	selectClassroom: function(q, r) {
		globalClassroomId = q;
		globalClassroomName = r;
		app.loadClassroom();	
	},
	
	loadClassroom: function() {
		
		// get teacher data
		var jqxhr = $.getJSON("http://kiosk.dakjr.com/json/scrollerItems.php?callback=?", {
			uuid: globalDeviceUUID,
			cid: globalClassroomId,
			b: globalBatteryStatus
		}, function(jsonp) {
			
			// only do loading if we get a positive response
			app.loadingScreen(true);
			document.getElementById('classroomOptionsDiv').style.display = 'none';
			document.getElementById('classroomConfirmDiv').style.display = 'none';
			document.getElementById('scrollerDiv').style.display = 'block';
			
			teacherList = jsonp.teacherList;
			fontSize = jsonp.fontSize;
			labelHeight = jsonp.labelHeight;
			lineHeight = jsonp.lineHeight;
			bottomAlign = jsonp.bottomAlign;
			globalDisplayTime = jsonp.displayTime;
			globalCycleLimit = jsonp.cycleLimit;
			scrollerDiv = document.getElementById('scrollerDiv');
			scrollerDiv.innerHTML = '';
			globalTeacherCount = 0;
			globalClassroomService = '';
			for (var i in teacherList) {
				teacherID = teacherList[i].teacherID;
				teacherImage = teacherList[i].teacherImage;
				teacherName = teacherList[i].teacherName;
				globalClassroomService = teacherList[i].teacherClassroomService;
				var iDiv = document.createElement('div');
				iDiv.id = 'teacher_' + i;
				iDiv.className = 'teacherImageContainer';
				iDiv.innerHTML = '<img src="' + teacherImage + '" class="teacherImage" alt="' + i + '" title="' + i + '" onclick="app.closeScroller();" />';
				scrollerDiv.appendChild(iDiv);
				var qDiv = document.createElement('div');
				qDiv.id = 'teacher_label_' + i;
				qDiv.className = 'teacherLabelContainer';
				qDiv.style.fontSize = fontSize;
				qDiv.style.lineHeight = lineHeight;
				qDiv.style.bottom = bottomAlign;
				var rDiv = document.createElement('div');
				rDiv.id = 'teacher_label_subA_' + i;
				rDiv.className = 'teacherLabelSubA';
				var sDiv = document.createElement('div');
				sDiv.id = 'teacher_label_subB_' + i;
				sDiv.innerHTML = teacherName;
				rDiv.appendChild(sDiv);
				qDiv.appendChild(rDiv);
				scrollerDiv.appendChild(qDiv);
				globalTeacherCount++;
			}
			var tDiv = document.createElement('div');
			tDiv.id = 'teacherClassroomService';
			if (globalClassroomService != '') {
				tDiv.innerHTML = globalClassroomName + '<br />' + globalClassroomService;
			} else {
				tDiv.innerHTML = globalClassroomName;
			}
			tDiv.onclick = (function() { 
				return function() {
					clearInterval(globalTimer);
					for (var q = 0; q < globalTeacherCount; q++) {
						document.getElementById('teacher_' + q).style.display = 'none';
						document.getElementById('teacher_label_' + q).style.display = 'none';
					}
					document.getElementById('teacherClassroomService').style.display = 'none';
					globalCycleCount = 0;
					currentTeacherId = 0;
					app.loginAdminView();
				}
			})();
			scrollerDiv.appendChild(tDiv);
			app.startTeacherRotation();
			app.loadingScreen(false);
		})
		.fail(function(e,f,g) {
			dummyVariable = -1;
			app.startTeacherRotation();
			//document.getElementById('classroomOptionsDiv').style.display = 'none';
			//document.getElementById('classroomConfirmDiv').style.display = 'none';
			//document.getElementById('scrollerDiv').style.display = 'none';
			//document.getElementById('debugDiv').style.display = 'block';
			displayPush('No Teachers Available');
		})
	},
	
	startTeacherRotation: function() {
		app.changeTeacher();
		globalTimer = setInterval('app.changeTeacher();',globalDisplayTime);
	},
	
	changeTeacher: function() {
		if (globalCycleCount >= globalCycleLimit) {
			clearInterval(globalTimer);
			for (var q = 0; q < globalTeacherCount; q++) {
				document.getElementById('teacher_' + q).style.display = 'none';
				document.getElementById('teacher_label_' + q).style.display = 'none';
			}
			document.getElementById('teacherClassroomService').style.display = 'none';
			globalCycleCount = 0;
			currentTeacherId = 0;
			app.loadClassroom();
		} else {
			document.getElementById('teacher_' + currentTeacherId).style.display = 'none';
			document.getElementById('teacher_label_' + currentTeacherId).style.display = 'none';
			if (currentTeacherId >= (globalTeacherCount-1)) {
				currentTeacherId = 0;
				globalCycleCount++;
			} else {
				currentTeacherId++;
			}
			document.getElementById('teacher_' + currentTeacherId).style.display = 'block';
			document.getElementById('teacher_label_' + currentTeacherId).style.display = 'table';
			document.getElementById('teacherClassroomService').style.display = 'block';
			document.getElementById('teacherClassroomService').style.bottom = document.getElementById('teacher_label_' + currentTeacherId).offsetHeight + 'px';
		}
	},
	
	closeScroller: function() {
		clearInterval(globalTimer);
		for (var q = 0; q < globalTeacherCount; q++) {
			document.getElementById('teacher_' + q).style.display = 'none';
			document.getElementById('teacher_label_' + q).style.display = 'none';
		}
		document.getElementById('teacherClassroomService').style.display = 'none';
		globalCycleCount = 0;
		currentTeacherId = 0;
		app.doMainScreen();
	},
	
	loginAdminView: function() {
		clearInterval(globalTimer);
		document.getElementById('classroomOptionsDiv').style.display = 'none';
		document.getElementById('classroomConfirmDiv').style.display = 'none';
		document.getElementById('scrollerDiv').style.display = 'none';
		document.getElementById('adminLoginDiv').style.display = 'block';
		globalAdminPassword = '';
		adminScreenTimeout = setTimeout('app.validateAdmin()',10000);
	},
	
	numberPad: function(v) {
		globalAdminPassword = globalAdminPassword + '' + v;
		if (globalAdminPassword.length == 4) {
			app.validateAdmin();
		}
	},
	
	validateAdmin: function() {
		clearTimeout(adminScreenTimeout);;
		var t = globalAdminPassword;
		if (t == 'HEDB') {
			globalAdminPassword = '';
			app.doAdminView();
			document.getElementById('adminLoginDiv').style.display = 'none';
		} else {
			globalAdminPassword = '';
			app.loadClassroom();
			document.getElementById('adminLoginDiv').style.display = 'none';
		}
	},
	
	doAdminView: function() {
		app.loadingScreen(true);
		document.getElementById('classroomOptionsDiv').style.display = 'none';
		document.getElementById('classroomConfirmDiv').style.display = 'none';
		document.getElementById('scrollerDiv').style.display = 'none';
		document.getElementById('adminLoginDiv').style.display = 'none';
		document.getElementById('adminDiv').style.display = 'block';
		
		// get teacher data
		var jqxhr = $.getJSON("http://kiosk.dakjr.com/json/allItems.php?callback=?", {
			uuid: globalDeviceUUID,
			cid: globalClassroomId,
			b: globalBatteryStatus
		}, function(jsonp) {
			teacherList = jsonp.teacherList;
			adminDiv = document.getElementById('adminDiv');
			adminDiv.innerHTML = '';
			globalTeacherService = '';
			globalServiceCount = 0;
			var jDiv = document.createElement('div');
			jDiv.id = 'globalHeader';
			jDiv.className = 'adminGlobalHeader';
			jDiv.innerHTML = globalClassroomName;
			adminDiv.appendChild(jDiv);
			for (var i in teacherList) {
				teacherID = teacherList[i].teacherID;
				teacherImage = teacherList[i].teacherImage;
				teacherName = teacherList[i].teacherName;
				teacherStatus = teacherList[i].teacherStatus;
				teacherService = teacherList[i].teacherService;
				if (teacherService != globalTeacherService) {
					globalTeacherService = teacherService;
					var hDiv = document.createElement('div');
					hDiv.id = 'serviceHeader_' + globalServiceCount;
					hDiv.className = 'adminHeader';
					hDiv.innerHTML = globalTeacherService;
					adminDiv.appendChild(hDiv);
					globalServiceCount++;
				}
				var iDiv = document.createElement('div');
				iDiv.id = 'teacher_' + i;
				iDiv.className = 'adminTeacher';
				if (teacherStatus == 'C') {
					statusDisplay = 'CONFIRMED';
				} else if (teacherStatus == 'U') {
					statusDisplay = 'UNCONFIRMED';
				} else if (teacherStatus == 'D') {
					statusDisplay = 'DECLINED';
				} else {
					teacherStatus = 'Q';
					statusDisplay = 'UNKNOWN';
				}
				iDiv.innerHTML = '<img src="' + teacherImage + '" class="adminTeacherImage" />&nbsp;<span class="adminTeacherName">' + teacherName + '</span>&nbsp;<span class="status_' + teacherStatus + '">&nbsp;' + statusDisplay + '&nbsp;</span>';				adminDiv.appendChild(iDiv);
			}
			var tDiv = document.createElement('div');
			tDiv.className = 'selectButton';
			tDiv.style.width = '80%';
			tDiv.style.margin = '25px auto';
			tDiv.innerHTML = 'Close Admin View';
			tDiv.onclick = (function() { 
				return function() {
					document.getElementById('adminDiv').style.display = 'none';
					document.getElementById('scrollerDiv').style.display = 'block';
					app.loadClassroom();
				}
			})();
			adminDiv.appendChild(tDiv);
			app.loadingScreen(false);
		})
		.fail(function(e,f,g) {
			dummyVariable = -1;
			document.getElementById('classroomOptionsDiv').style.display = 'none';
			document.getElementById('classroomConfirmDiv').style.display = 'none';
			document.getElementById('scrollerDiv').style.display = 'none';
			document.getElementById('adminDiv').style.display = 'none';
			document.getElementById('debugDiv').style.display = 'block';
			displayPush('Admin view unavailable');
		})
	},
	
	startShutdown: function() {
		
		// prevent double-closure (hide link)
		$('#closeDiv').hide();
		
		// close application
		if (navigator.app) {
			navigator.app.exitApp();
		} else if (navigator.device) {
			navigator.device.exitApp();
		} else {
			displayPush('Shutdown operation not supported');
		}
		
	},
	
	checkNewAppVersion: function(){
		var jqxhr = $.getJSON("http://kiosk.dakjr.com/json/version.php?callback=?", {
			uuid: globalDeviceUUID
		}, function(jsonp) {
			currentVersion = jsonp.currentVersion;
			currentLink = jsonp.currentLink;
			if (currentVersion != globalAppVersion) {
				document.getElementById('newVersionLink').href = currentLink;
				document.getElementById('newVersionDiv').style.display = 'block';
			} else {
				app.getConnection();
			}
		})
		.fail(function(e,f,g) {
			app.getConnection();
		})
	},
	
    initialize: function() {		
		
		var self = this;
		app.checkNewAppVersion();
		
    }

};