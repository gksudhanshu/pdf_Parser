'use strict';
var fs = require('fs');
var pdfUtil = require('pdf-to-text');

//mongodb connection...
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var url = 'mongodb://localhost:27017/pdfdata';

MongoClient.connect(url, function (err, db) {
    if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
        //HURRAY!! We are connected. :)
        console.log('Connection established to', url);

//----------------------------------for automation----------------------------------------------------------------------

        var h = fs.readdirSync('pdfFiles');//returns all the files into array.

//---------------------------------convert pdf to text------------------------------------------------------------------

        for (var q = 0; q < h.length; q++) {
            var b = h[q].replace('pdf', 'txt');
            var c = h[q].replace('pdf', 'JSON');
            var b1 = 'page3' + h[q].replace('pdf', 'txt');
            var pdf_path = "pdfFiles/" + h[q];


            pdfUtil.pdfToText(pdf_path, function (err, data) {
                if (err) throw(err);
                // console.log("successfully converted into text file"); //print text
                fs.writeFile("pdfText/" + b, data);
                // console.log(data.indexOf('Agreement Activity'));

                //-------------------------------Extract data from text file--------------------------------------------------

                var partMainArr = [];
//-----------------------------------------------Extract Agreement:---------------------------------------------------

                var Agreement = data.match(/\MPA+\d[0-9]{4}/i);
                partMainArr.push('{' + JSON.stringify('Agreement') + ':' + JSON.stringify(Agreement[0]));
                //  console.log(Agreement);

//-------------------------------------------Extract VendorNumber----------------------------------------------------
                var flag=true;
                var vendor = data.substring(data.indexOf("Vendor #:"));
                //  console.log(vendor);
                //split either on new line or 3 spaces.
                var vendArr = vendor.split(/\n|   /);
                //removing all null values
                var vendArr = vendArr.filter(function (val) {
                    return val !== '';
                });
                //second element will be the vendorName
                // console.log(vendArr[1]);
                var VendorNumber = Number(vendArr[1]).toString();

                //console.log('vendorNo:' + VendorNumber);
                if(VendorNumber=='NaN')
                {
                    flag=false;
                    partMainArr.push(JSON.stringify('VendorNumber') + ':' +JSON.stringify('000000'));//------------2nd argument
                }
                else {
                    flag=true;
                    partMainArr.push(JSON.stringify('VendorNumber') + ':' + VendorNumber);//------------2nd argument
                }
                partMainArr.push(JSON.stringify('isVendorNumber')+':'+flag);

//--------------------------------------Extract Departmant----------------------------------------------------------

                var dept = data.match(/\(\d[0-9]{2}/i);
                var y = dept.toString().replace('(', '');
                y = Number(y).toString();//to remove leading zeros
                // console.log('Dept:'+y);
                var deptNo = JSON.parse(JSON.stringify(dept).replace('(', ''));
                partMainArr.push(JSON.stringify('Dept') + ':' + y);//--------------------------------3dr argument

//TODO CHANGING CODE To match only after participants

                //--------------------------------------------------/(MerchantApprover|Vendor|Marketer)/------------------------------
                var RoleInEmail = 0;

                var page = data.substring(data.indexOf("Participants") + 1);
                // console.log(page);
                var participant = page.match(/([a-zA-Z._ -]+\/[a-zA-Z._ -]+\/[)#0-9(a-zA-Z._ &-]+\ *[A-Z]+)/gi);

                // getting participants name line---------------------------
                for (var tr = 0; tr < participant.length; tr++) {
                    participant[tr] = participant[tr].trim();
                }
                // console.log(participant);
                var contact = [];
                var Details = [];                  //it will contain all the details(name/type/vendor)
                var contactArr = [];
                //---------------------------------To remove extra string other than contact details----------------------------

//----------------------------------To extract emails and role---------------------------------------------------

                var Emails = [];
                var Role = [];
                var role;
                //match emails row-----------
                var participant1 = page.match(/([a-zA-Z0-9._ -]+@[a-zA-Z0-9._ -]+\.[a-zA-Z0-9._-]+\ *[A-Z]+)/gi);
                // console.log(participant1);
                //split the participant1 array which contains emails and role and may contain some unwanted string
                for (var er = 0; er < participant1.length; er++) {
                    var emailRole = participant1[er].split('   ');

                    var EmRo = emailRole.filter(function (val) {
                        return val !== '';
                    });
                    // console.log(EmRo);
                    //first element must be emails and second must be role.
                    Emails.push(JSON.stringify('Email') + ':' + JSON.stringify(EmRo[0].trim().replace(/ /g, '').toLowerCase()));


                    //--------------------------------------extracting role from email----------------------------------------------------

                    // console.log(EmRo[1]);
                    if (EmRo[1] != undefined) {
                        EmRo[1] = EmRo[1].trim();
                        // console.log(EmRo[1]);
                        if (EmRo[1] == "Approver") {
                            RoleInEmail = 1;          //reference to push vendor in mainarray
                            Role.push(JSON.stringify('Role') + ':' + JSON.stringify(EmRo[1].trim()));
                        } else if (EmRo[1] == "Inform") {
                            RoleInEmail = 1;          //reference to push vendor in mainarray
                            Role.push(JSON.stringify('Role') + ':' + JSON.stringify(EmRo[1].trim()));

                        }
                        else {
                            Role.push(JSON.stringify('Role') + ':' + JSON.stringify('Not Avilable'));
                        }
                    }
                    //-------------------------------------------extracting role from name-----------------------------------------------
                    else {
                        role = participant[er].split('   ');
                        // console.log(role[1]);

                        var ro = role.filter(function (val) {
                            return val !== '';
                        });
                        if (ro[1] != undefined) {
                            ro[1] = ro[1].trim();
                            if ((ro[1] == "Approver")) {
                                Role.push(JSON.stringify('Role') + ':' + JSON.stringify(ro[1].trim()));
                            } else if (ro[1] == "Inform") {
                                Role.push(JSON.stringify('Role') + ':' + JSON.stringify(ro[1].trim()));
                            }
                            else {
                                Role.push(JSON.stringify('Role') + ':' + JSON.stringify('Not Avilable'));
                            }
                        }
                    }

                }

// -------------------------------------------------name/type/vendor----------------------------------------------------
                var count = 0;
                for (var i = 0; i < participant.length; i++) {
                    var ab = participant[i].split('   ');

                    Details.push(ab[0].trim());

                    //spliting into name,type and vendor
                    var ntv = [];
                    for (var sp = 0; sp < Details.length; sp++) {
                        contact = [];
                        ntv = Details[sp].split('/');
                        // console.log(ntv);

                        //push into contact----------------
                        contact.push(JSON.stringify('Name') + ':' + JSON.stringify(ntv[0].trim()));
                        contact.push(JSON.stringify('Type') + ':' + JSON.stringify(ntv[1].trim()));
                        // contact.push(JSON.stringify('Vendor') + ':' + JSON.stringify(ntv[2].trim()));
                        contact.push(Emails[sp]);
                        //  console.log(Role[sp]);
                        contact.push(Role[sp]);
                        // ntv[2]=ntv[2].split('   ');
                        //set non-target vendor as vendor
                        var val = 'true';
                        // console.log(ntv[2]);
                        var target = ntv[2].trim().substr(0, 6);

                        if (target != 'Target') {
                            val = 'false';
                        }
                        contact.push(JSON.stringify('isTargetPerson') + ':' + val);

                        if (val == true) {
                            contact.push(JSON.stringify('Vendor') + ':' + JSON.stringify(ntv[2].trim()));

                        } else {
                            contact.push(JSON.stringify('Vendor') + ':' + JSON.stringify(ntv[2].trim()));
                        }
                        // console.log(contact);
                    }
                    contactArr.push(JSON.parse('{' + contact + '}'));

                    //adding vendor in main array---------------------------------------------------
                    if (RoleInEmail == 1) {
                        if (ntv[2].trim().substr(0, 6) != 'Target') {
                            if (count == 0) {
                                partMainArr.push(JSON.stringify('Vendor') + ':' + JSON.stringify(ntv[2].trim()));
                                count++;
                            }
                        }
                    }
                    else {

                        if (ntv[2].trim().substr(0, 6) != 'Target') {
                            if (count == 0) {
                                partMainArr.push(JSON.stringify('Vendor') + ':' + JSON.stringify(ntv[2].trim()));
                                count++;
                            }
                        }
                    }

                }
                // console.log(contactArr);
                partMainArr.push(JSON.stringify('Contacts') + ':' + JSON.stringify(contactArr) + '}');

                //  fs.writeFile("pdfJSON/MPA36787", partMainArr);



                console.log(partMainArr);
                //------------------------Store into Mongodb-----------------------------------------------------------------------

                //TODO change the cllection name before running
                var collection = db.collection('mpapdf_feb_2017');
                collection.insert(JSON.parse(partMainArr), function (err, result) {
                    if (err) {
                        console.log(err);
                    }else {
                        console.log('Successfully Inserted into mongodb: Agreement:'+Agreement[0]);
                    }
                });

            });
        }
    }
});

