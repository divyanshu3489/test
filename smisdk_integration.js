const path = require('path');
const fs = require('fs');
const glob = require('glob');
const xml = require('xmldoc');
const DOMParser = require('@xmldom/xmldom').DOMParser;
const XMLSerializer = require('@xmldom/xmldom').XMLSerializer;

function findAndroidAppFolder(folder) {
  const flat = 'android';
  const nested = path.join('android', 'app');
  if (fs.existsSync(path.join(folder, nested))) {
    return nested;
  }
  if (fs.existsSync(path.join(folder, flat))) {
    return flat;
  }
  return null;
};

//Find and Read app level build.gradle file
function findGradleFile(folder) {
  const gradlePath = glob.sync(path.join('**', 'build.gradle'), {
    cwd: folder,
    ignore: ['node_modules/**', '**/build/**', 'Examples/**', 'examples/**', '**/debug/**'],
  })[0]; 

  return gradlePath ? path.join(folder, gradlePath) : null;
};

function readGradle(gradlePath) {
  const gradleFile = fs.readFileSync(gradlePath, 'utf8');
  let packageId = '';
  gradleFile.split(/\r?\n/).forEach(line =>  {
    if(line.includes('namespace')){
      // console.log(`Line from file: ${line}`);
      let line1 = line.trim();
      packageId = line1.split(" ");
    }  
    else if(line.includes('applicationId')) {
      // console.log(`Line from file: ${line}`);
      let line1 = line.trim();
      packageId = line1.split(" ");
    }
  });
  // console.log(packageId[1].slice(1,-1));
  return packageId[1].slice(1,-1);
};


//Find and read AndroidManifest.xml file
function findManifest(folder) {
  const manifestPath = glob.sync(path.join('**', 'AndroidManifest.xml'), {
    cwd: folder,
    ignore: ['node_modules/**', '**/build/**', 'Examples/**', 'examples/**', '**/debug/**'],
  })[0]; 

  return manifestPath ? path.join(folder, manifestPath) : null;
};

function readManifest(manifestPath) {
  return new xml.XmlDocument(fs.readFileSync(manifestPath, 'utf8'));
};

const getPackageName = (manifest) => manifest.attr.package;

function getApplicationClassName(folder) {
  
  //Getting all java files from folder
  const files = glob.sync('**/*.java', {
    cwd: folder
  });

  //Folder didn't have java files
  if(files.length === 0){
    const files = glob.sync('**/*.kt', {
      cwd: folder
    });
  
    const packages = files
      .map(filePath => fs.readFileSync(path.join(folder, filePath), 'utf8'))
      .map(file => file.match(/class\s+(\w+)\s*:\s*Application\(\)\s*,\s*ReactApplication/))
      .filter(match => match);

      const extension = path.extname(files[0]);

      const classDetails = packages.length ? { 
        "className" : packages[0][1], 
        "fileExtension": extension 
      } : null
  
      return classDetails;
  }

  const packages = files
    .map(filePath => fs.readFileSync(path.join(folder, filePath), 'utf8'))
    .map(file => file.match(/class (.*) implements (.*)ReactApplication/))
    .filter(match => match);

    const extension = path.extname(files[0]);

      const classDetails = packages.length ? { 
        "className" : packages[0][1], 
        "fileExtension": extension 
      } : null
  
      return classDetails;
  };

   // String append
  function insert(str, index, value) {
  return str.substr(0, index) + value + str.substr(index);
}

function findStringsXml(folder) {
  const stringsXmlPath = glob.sync(path.join('**', 'strings.xml'), {
    cwd: folder,
    ignore: ['node_modules/**', '**/build/**', 'Examples/**', 'examples/**', '**/debug/**'],
  })[0];

  return stringsXmlPath ? path.join(folder, stringsXmlPath) : null;
};


   // update string.xml file
   function updateConfigurationFile(confFilePath){
      console.log('updateConfigurationFile()');
      const smisdkApikey = '\n<string name="smisdk_apikey"></string>';
      const smisdkShowMessaging = '\n<bool name="smisdk_show_messaging">true</bool>';
      const smisdkStartVpn = '\n<bool name="smisdk_start_vpn">true</bool>';
      const smisdkControlledVpn = '\n<bool name="smisdk_controlled_vpn">false</bool>';
     
      var stringsXmlDoc= fs.readFileSync(confFilePath, 'utf8');
      var resourcesEndIndex = stringsXmlDoc.search("</resources>")
      if(stringsXmlDoc.search('smisdk_apikey')<0){
         stringsXmlDoc = insert(stringsXmlDoc, resourcesEndIndex-1, smisdkApikey);
      }
      if (stringsXmlDoc.search('smisdk_show_messaging') < 0) {
        stringsXmlDoc = insert(stringsXmlDoc, resourcesEndIndex - 1, smisdkShowMessaging);
      }
      if (stringsXmlDoc.search('smisdk_start_vpn') < 0) {
        stringsXmlDoc = insert(stringsXmlDoc, resourcesEndIndex - 1, smisdkStartVpn);
      }
      if (stringsXmlDoc.search('smisdk_controlled_vpn') < 0) {
        stringsXmlDoc = insert(stringsXmlDoc, resourcesEndIndex - 1, smisdkControlledVpn);
      }
      fs.writeFileSync(confFilePath, stringsXmlDoc, 'utf8');
   }

// update manifest file with app name
function updateManifestFile(manifestPath, applicationClassName) {
  console.log('updateManifestFile()');
  var manifestXmlDoc = new DOMParser().parseFromString(fs.readFileSync(manifestPath, 'utf8'));
  var attrApplication = manifestXmlDoc.getElementsByTagName("application");
  // console.log('attrApplication:' + attrApplication[0]);
  const attrApplicationLength = attrApplication[0].attributes.length;
  // insert/update android:name attribute to manifest

      var i;
   	for (i = 0; i < attrApplicationLength; i++) {
       	var attrNodeName = attrApplication[0].attributes[i].nodeName;
       	if(attrNodeName.search('android:name')>=0){
       		var attrNodeValue = attrApplication[0].attributes[i].nodeValue;
       		if(attrNodeValue === ('.'+applicationClassName)){
       		   console.log('app class name matched');
       		}else{
       			console.log('app class name not matched:' + applicationClassName);
       			attrApplication[0].removeAttribute(attrApplication[0].attributes[i].nodeName);
   				attrApplication[0].setAttribute('android:name ', '.' +applicationClassName);
       			fs.writeFileSync(manifestPath, manifestXmlDoc, 'utf8');
       		}
       		break;
       	}
       	else if (i == attrApplicationLength-1){
       		// android:name does not exist
       		console.log('android:name does not exist in manifest file');
       		attrApplication[0].setAttribute('android:name ', '.' +applicationClassName);
       		fs.writeFileSync(manifestPath, manifestXmlDoc, 'utf8');
       	}

   	}
   }

//Implementtion to add network security config.
 function updateNetworkConfig(filePath){
    // const filePath = "res/xml/network_security_config.xml";
    console.log("network_security_config.xml path : "+filePath);

    if(checkNetworkConfigExist(filePath)){
      var xmlDoc = new DOMParser().parseFromString(fs.readFileSync(filePath, "utf-8"), "text/xml");
      checkClearTextValue(xmlDoc, filePath);

      if(checkDatamiDomain(xmlDoc)){
        console.log("Datami Domain already available !!");
      }else{
        addDatamiDoamin(xmlDoc, filePath);
      }
    }else{
      createNewNetworkConfig(filePath);
    }

 }

 function addDatamiDoamin(xmlDoc, filePath){
    newElement = xmlDoc.createElement('domain');
    textElement = xmlDoc.createTextNode('cloudmi.datami.com');
    newElement.setAttribute("includeSubdomains", "true");
    newElement.appendChild(textElement);
    nodeNetworkConfig = xmlDoc.getElementsByTagName('domain-config')[0];
    nodeNetworkConfig.appendChild(newElement);

    console.log('nodeNetworkConfig: ' + nodeNetworkConfig.length);

      fs.writeFileSync(filePath, xmlDoc, 'utf8');

 }

 function checkDatamiDomain(xmlDoc){
  available = false;

  nodeNetworkConfig = xmlDoc.getElementsByTagName('domain');
  console.log('nodeNetworkConfig: ' + nodeNetworkConfig.length);

  for(var i =0; i<nodeNetworkConfig.length; i++){
    if(nodeNetworkConfig[i].nodeType ==1){
      var domainName = nodeNetworkConfig[i].childNodes[0].nodeValue;
      if(null != domainName && domainName.localeCompare('cloudmi.datami.com') == 0){
        available = true;
        break;
      }
    }
  }

  return available;
 }

 function checkNetworkConfigExist(filePath){
    return fs.existsSync(filePath, fs.constants.F_OK);
 }

 function createNewNetworkConfig(filePath){
   var xmlString = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">cloudmi.datami.com</domain>
    </domain-config>
</network-security-config>`;

    var xmlFile = fs.appendFileSync(filePath, xmlString, "utf-8");
     
      console.log("File created ...");

 }

 function checkClearTextValue(xmlDoc, filePath){
    configChanged = false;

    element = xmlDoc.getElementsByTagName('domain-config')[0];
    attribute = element.getAttributeNode("cleartextTrafficPermitted");
    if(null == attribute){
      console.log("Clear Text Value not available so creating NEW ");
      element.setAttribute("cleartextTrafficPermitted", "true");
      configChanged = true;
    }else{
      if(true == attribute.nodeValue){
        console.log("Clear Text Value alreaady set."+attribute.nodeValue);
      }else{
        configChanged = true;
        element.setAttribute("cleartextTrafficPermitted", "true");
        console.log("Clear Text Value set to true.");
      }
    }

    if(configChanged){
        fs.writeFileSync(filePath, xmlDoc, 'utf8');
    }
 }


   //// Main function to perform integration
   function projectConfigAndroid(folder) {
      const androidAppFolder = findAndroidAppFolder(folder);

      if (!androidAppFolder) {
     	   console.log('App folder not available.');
         return null;
      }

      const sourceDir = path.join(folder, androidAppFolder);

      //update network security config
      // updateNetworkConfig(sourceDir+'/src/main/res/xml/network_security_config.xml');

      const manifestPath = findManifest(sourceDir);
      
      const gradlePath = findGradleFile(sourceDir);

  if (!manifestPath) {
    return null;
  }

  // check app class Availability

  const applicationClassDetails = getApplicationClassName(sourceDir + '/src/main')
  var applicationClassName = applicationClassDetails.className;
  var fileExtension = applicationClassDetails.fileExtension;

  if (applicationClassName == null) {
    // Application class not available. 
    //Copy application class and update manifest with application name

    console.log('Application class not available. Please use sample ApplicaitionClass.txt to create one and update AndroidManifest.xml with application name.');

    // const manifest = readManifest(manifestPath);
    // const packageName = getPackageName(manifest);
    // const packageNameStr = "package " + packageName + ';\n';
    // const packageFolder = packageName.replace(/\./g, path.sep);
    // const appPackagePath = path.join(sourceDir, `src/main/java/${packageFolder}`);

    // var datamiAppFile = fs.readFileSync('ApplicationClass.txt', 'utf8')
    // if (datamiAppFile.search(packageNameStr) < 0) {
    //   var datamiAppFile = insert(datamiAppFile, 0, packageNameStr);
    // }
    // var datamiApplicationClassName = 'MainApplication';
    // fs.writeFileSync(appPackagePath + '/' + datamiApplicationClassName + '.java', datamiAppFile, 'utf8');

    // // update manifest with app name
    // updateManifestFile(manifestPath, datamiApplicationClassName);

    // update configuration file
    const stringsXmlPath = findStringsXml(sourceDir);
    if (stringsXmlPath != null) {
      updateConfigurationFile(stringsXmlPath);
    }
  } else {
      // Application class available
      var applicationClassNameSplit = applicationClassName.split(' ');
      if (applicationClassNameSplit.length > 0) {
        applicationClassName = applicationClassNameSplit[0];

        const manifest = readManifest(manifestPath);
        // console.log('manifest', manifest);
        let packageName = '';
        packageName = getPackageName(manifest);

        if(!packageName){
          packageName = readGradle(gradlePath);
        }
        
        console.log('packageName: ' + packageName);
        const packageFolder = packageName. replace(/\./g, path.sep);
        // console.log('packageFolder: ' + packageFolder);

        let mainApplicationPath = '';
        if(fileExtension == ".java"){
          mainApplicationPath = path.join(sourceDir,
            `src/main/java/${packageFolder}/${applicationClassName}.java`);
        } else if(fileExtension == ".kt"){
          mainApplicationPath = path.join(sourceDir,
            `src/main/java/${packageFolder}/${applicationClassName}.kt`);
        }

        //Read application class
        const appFile = fs.readFileSync(mainApplicationPath, 'utf8');

        var isPackageExist = appFile.search('SmiSdkReactPackage');
        if (isPackageExist < 0) { 
          if(fileExtension === ".java") {
            const smiPackageName = ', new SmiSdkReactPackage()';
            const smiPackageNameFor62 = 'packages.add(new SmiSdkReactPackage());\n';

            const packageImport = 'import com.datami.smi.SdStateChangeListener; \nimport com.datami.smi.SmiResult; \nimport com.datami.smi.SmiVpnSdk; \nimport com.datami.smi.SmiSdk; \nimport com.datami.smisdk_plugin.SmiSdkReactModule; \nimport com.datami.smisdk_plugin.SmiSdkReactPackage; \nimport com.datami.smi.internal.MessagingType; \n';

            const initSponsoredDataAPI = '\nSmiVpnSdk.initSponsoredData(getResources().getString(R.string.smisdk_apikey), \nthis, R.mipmap.ic_launcher, dmiMessaging, dmiStartVpn, 0, dmiControlledVpn);';

            const stringParse = '\nboolean dmiUserMessaging = getResources().getBoolean(R.bool.smisdk_show_messaging);  \nboolean dmiStartVpn = getResources().getBoolean(R.bool.smisdk_start_vpn);  \nboolean dmiControlledVpn = getResources().getBoolean(R.bool.smisdk_controlled_vpn);  \nMessagingType dmiMessaging = MessagingType.NONE;   \nif(dmiUserMessaging){ \n   dmiMessaging = MessagingType.BOTH; \n }\n';

            const onCreateMethod = '\n @Override \n public void onCreate() { \n  super.onCreate();' + stringParse + initSponsoredDataAPI + ' \n}';

            const stateChangeListnerStr = ' SdStateChangeListener, ';

            const onChangeMethod = '\n@Override \n public void onChange(SmiResult smiResult) {\n SmiSdkReactModule.setSmiResultToModule(smiResult);\n}';

            var intMainPackageIndex = appFile.search("new MainReactPackage()")

            const packageImportArray = 'import java.util.Arrays; \n';
            var intMainPackageIndexLatest = appFile.search("return packages;")

            if (intMainPackageIndex > 0) {
              // add package name
              var appfileNew = insert(appFile, intMainPackageIndex + 22, smiPackageName);
              // add import
              var intImportIndex = appFile.search("import")
              appfileNew = insert(appfileNew, intImportIndex, packageImport);

              //add sdStateChangeListner
              var implementsIndex = appfileNew.search("implements");
              if (implementsIndex > 0) {
                appfileNew = insert(appfileNew, implementsIndex + 10, stateChangeListnerStr);
              }
              // add initSponsoredData Api
              var intSuperIndex = appfileNew.search("super.onCreate()");
              if (intSuperIndex > 0) {
                appfileNew = insert(appfileNew, intSuperIndex + 17, stringParse + initSponsoredDataAPI);
              } else {
                // add onCreate method with initSponsoredData API
                var n = appfileNew.lastIndexOf("}");
                console.log('lastIndexOf }: ' + n);
                appfileNew = insert(appfileNew, n - 1, onCreateMethod);
              }

              // add onChange method
              var lastchar = appfileNew.lastIndexOf("}");
              console.log('lastchar: ' + n);

              appfileNew = insert(appfileNew, lastchar - 1, onChangeMethod);

              fs.writeFileSync(mainApplicationPath, appfileNew, 'utf8');

              // const appFileNew2 = fs.readFileSync(mainApplicationPath, 'utf8')
              updateManifestFile(manifestPath, applicationClassName);
              // update configuration file
              const stringsXmlPath = findStringsXml(sourceDir);
              if (stringsXmlPath != null) {
                updateConfigurationFile(stringsXmlPath);
              }

            } else if (intMainPackageIndexLatest > 0) {
              // add package name
              var appfileNew = insert(appFile, intMainPackageIndexLatest, smiPackageNameFor62);
              // add import
              var intImportIndex = appFile.search("import")
              appfileNew = insert(appfileNew, intImportIndex, packageImport);
              appfileNew = insert(appfileNew, intImportIndex, packageImportArray);

              //add sdStateChangeListner
              var implementsIndex = appfileNew.search("implements");
              if (implementsIndex > 0) {
                appfileNew = insert(appfileNew, implementsIndex + 10, stateChangeListnerStr);
              }
              // add initSponsoredData Api
              var intSuperIndex = appfileNew.search("super.onCreate()");
              if (intSuperIndex > 0) {
                appfileNew = insert(appfileNew, intSuperIndex + 17, stringParse + initSponsoredDataAPI);
              } else {
                // add onCreate method with initSponsoredData API
                var n = appfileNew.lastIndexOf("}");
                console.log('lastIndexOf }: ' + n);
                appfileNew = insert(appfileNew, n - 1, onCreateMethod);
              }

              // add onChange method
              var lastchar = appfileNew.lastIndexOf("}");
              console.log('lastchar: ' + n);

              appfileNew = insert(appfileNew, lastchar - 1, onChangeMethod);

              fs.writeFileSync(mainApplicationPath, appfileNew, 'utf8');

              // const appFileNew2 = fs.readFileSync(mainApplicationPath, 'utf8')
              updateManifestFile(manifestPath, applicationClassName);
              // update configuration file
              const stringsXmlPath = findStringsXml(sourceDir);
              if (stringsXmlPath != null) {
                updateConfigurationFile(stringsXmlPath);
              }
            } else {
              console.log('Error MainReactPackage does not exist.');
            }
          } else if(fileExtension === ".kt"){
            const smiPackageName = ', new SmiSdkReactPackage()';
            const smiPackageNameFor73 = 'packages.add(new SmiSdkReactPackage());\n';
            const smiPackageNameAbove74 = '\nadd(SmiSdkReactPackage());\n';

            const packageImport = 'import com.datami.smi.SdStateChangeListener \nimport com.datami.smi.SmiResult \nimport com.datami.smi.SmiVpnSdk \nimport com.datami.smi.SmiSdk \nimport com.datami.smisdk_plugin.SmiSdkReactModule \nimport com.datami.smisdk_plugin.SmiSdkReactPackage \nimport com.datami.smi.internal.MessagingType \n';

            const initSponsoredDataAPI = '\nSmiVpnSdk.initSponsoredData(resources.getString(R.string.smisdk_apikey), \nthis, R.mipmap.ic_launcher, dmiMessaging, dmiStartVpn, 0, dmiControlledVpn)\n';

            const stringParse = '\nval dmiUserMessaging = resources.getBoolean(R.bool.smisdk_show_messaging)  \nval dmiStartVpn = resources.getBoolean(R.bool.smisdk_start_vpn);  \nval dmiControlledVpn = resources.getBoolean(R.bool.smisdk_controlled_vpn);  \nval dmiMessaging = MessagingType.NONE;   \nif(dmiUserMessaging){ \n   dmiMessaging = MessagingType.BOTH; \n }\n';

            const onCreateMethod = '\n override fun onCreate() { \n  super.onCreate()' + stringParse + initSponsoredDataAPI + ' \n}';
           
            const stateChangeListnerStr = ', SdStateChangeListener';

            const onChangeMethod = '\noverride fun onChange(smiResult: SmiResult) {\n SmiSdkReactModule.setSmiResultToModule(smiResult)\n}';

            var intMainPackageIndex = appFile.search("new MainReactPackage()")

            //For React native 0.73
            const regexFor073 = /return PackageList\(this\)\.packages/;
            var intMainPackageIndexFor073 = appFile.search(regexFor073);

            //For React Native above 0.73
            const regexAbove073 = /PackageList\(this\)\.packages\.apply/;
            const searchTextAbove073 = "PackageList(this).packages.apply {";
            var intMainPackageIndexAbove073 = appFile.search(regexAbove073);

            if (intMainPackageIndex > 0) {
              // add package name
              var appfileNew = insert(appFile, intMainPackageIndex + 22, smiPackageName);
              // add import
              var intImportIndex = appFile.search("import")
              appfileNew = insert(appfileNew, intImportIndex, packageImport);

              //add sdStateChangeListner
              var implementsIndex = appfileNew.search("implements");
              if (implementsIndex > 0) {
                appfileNew = insert(appfileNew, implementsIndex + 10, stateChangeListnerStr);
              }
              // add initSponsoredData Api
              var intSuperIndex = appfileNew.search("super.onCreate()");
              if (intSuperIndex > 0) {
                appfileNew = insert(appfileNew, intSuperIndex + 17, stringParse + initSponsoredDataAPI);
              } else {
                // add onCreate method with initSponsoredData API
                var n = appfileNew.lastIndexOf("}");
                console.log('lastIndexOf }: ' + n);
                appfileNew = insert(appfileNew, n - 1, onCreateMethod);
              }

              // add onChange method
              var lastchar = appfileNew.lastIndexOf("}");
              console.log('lastchar: ' + n);

              appfileNew = insert(appfileNew, lastchar - 1, onChangeMethod);

              fs.writeFileSync(mainApplicationPath, appfileNew, 'utf8');

              // const appFileNew2 = fs.readFileSync(mainApplicationPath, 'utf8')
              updateManifestFile(manifestPath, applicationClassName);
              // update configuration file
              const stringsXmlPath = findStringsXml(sourceDir);
              if (stringsXmlPath != null) {
                updateConfigurationFile(stringsXmlPath);
              }

            } else if (intMainPackageIndexFor073 > 0 || intMainPackageIndexAbove073 > 0) {

              // add package name
              var appfileNew = '';
              if(intMainPackageIndexFor073 > 0){
                appfileNew = insert(appFile, intMainPackageIndexFor073, smiPackageNameFor73);
              } else if(intMainPackageIndexAbove073 > 0) {
                appfileNew = insert(appFile, intMainPackageIndexAbove073 + searchTextAbove073.length, smiPackageNameAbove74);
              }

              // add import
              var intImportIndex = appFile.search("import")
              appfileNew = insert(appfileNew, intImportIndex, packageImport);

              //add sdStateChangeListner
              const regex = /Application\(\)/;
              const searchText = "Application()";
              var implementsIndex = appfileNew.search(regex);

              if (implementsIndex > 0) {
                appfileNew = insert(appfileNew, implementsIndex + searchText.length, stateChangeListnerStr);
              }

              // add initSponsoredData Api
              var intSuperIndex = appfileNew.search("super.onCreate()");
              if (intSuperIndex > 0) {
                appfileNew = insert(appfileNew, intSuperIndex + 17, stringParse + initSponsoredDataAPI);
              } else {
                // add onCreate method with initSponsoredData API
                var n = appfileNew.lastIndexOf("}");
                console.log('lastIndexOf }: ' + n);
                appfileNew = insert(appfileNew, n - 1, onCreateMethod);
              }

              // add onChange method
              var lastchar = appfileNew.lastIndexOf("}");
              console.log('lastchar: ' + n);

              appfileNew = insert(appfileNew, lastchar - 1, onChangeMethod);

              fs.writeFileSync(mainApplicationPath, appfileNew, 'utf8');

              // const appFileNew2 = fs.readFileSync(mainApplicationPath, 'utf8')
              updateManifestFile(manifestPath, applicationClassName);
              // update configuration file
              const stringsXmlPath = findStringsXml(sourceDir);
              if (stringsXmlPath != null) {
                updateConfigurationFile(stringsXmlPath);
              }
            } else {
              console.log('Error MainReactPackage does not exist.');
            }
          }
        } else {
          console.log('SmiSdkReactPackage already exist.');
        }
      } else {
        console.log('Error in getting applicationClassName.');
      }
    }
    /////////////////////////////////////////////////////////////////////////////////////////////////////
   };

   projectConfigAndroid('../..')