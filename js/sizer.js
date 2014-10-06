//instantiate lists (global)
var keyList = [];
var compKeyList = [];
var staticList = [];

//instantiate counts (global)
var compLength = 0;
var columnLength = 0;
var primaryKey;

var processTableDef = function(value){

//here's the regex defs
	var cqlCreateTableRegex  = /^CREATE\s+TABLE\s+(\S+)\s*\(\s*( *\t*\S+\s+\S+(\s+PRIMARY KEY|\s+static)*\s*,\s*)+(( *\t*\S+\s+\S+\s*\)$)|( *\t*PRIMARY KEY\s*\(.+\)\s*\)))/ig;
	var cqlColumnsRegex = /^\(* *\t*\S+\s+\S+(\s+PRIMARY KEY|\s+static)*\s*,*\s*$/igm;
	var cqlCompoundPrimaryKeys = /\(\(\s*\S+\s+\S+\)/igm;
	var cqlPrimaryKeys = /^\(* *\t*PRIMARY KEY\s*\(.+\)\s*$/igm;


	$('#parameters input').remove();
	$('#parameters p').remove();
//	is the table definition valid?
	if(cqlCreateTableRegex.test(value)){
		keyList = [];
		compKeyList = [];
		staticList = [];


		$('#valid').html("Table Validated, please insert expected sizes in bytes");
		$('#parameters').append("<p>Number of Rows:<\p>"+"<input id='rowCount'></input>");

		var i=0;
		var columns =value.match(cqlColumnsRegex);
		columnLength = columns.length;


		//identify explicit primary keys
		var keys = value.match(cqlPrimaryKeys);
		if (keys !== null){
			keys = keys.toString();
			keys = keys.replace("PRIMARY KEY","").replace(/\(+/ig,"").replace(/\)+/gi,"").trim().split(",");
			keys = $.each(keys,function(i, v){
				keys[i] = v.trim();
			});
		}

		//identify explicit compound keys
		var compKeys = value.match(cqlCompoundPrimaryKeys);
		if (compKeys !== null){
			compKeys = compKeys.toString();
			compKeys = compKeys.replace("PRIMARY KEY","").replace(/\(+/ig,"").replace(/\)+/gi,"").trim().split(",");
			compKeys = $.each(compKeys,function(i, v){
				compKeys[i] = v.trim();
			});
		}

		while (i<columnLength){
			colDat = columns[i].replace(/\(\S+\)/i,"").replace(/\(/i,"").replace(/\)/i,"").replace(/,/i,"").trim().split(/\s+/);
			colString = colDat[0]+" of type "+colDat[1];
			$('#parameters').append("<p>"+colString+"<\p>"+"<input id='columnSize_"+ i +"'></input>");

			//inline primary key declaration
			if ((colDat.length>2 && colDat[2]=="PRIMARY" && colDat[3]=="KEY")){
				keyList.push(i);
			}
			//count Static columns
			if ((colDat.length>2 && colDat[2]=="STATIC")){
				staticList.push(i);
			}
			//add explicit keys to list
			if($.inArray(colDat[0],keys) >= 0){
				keyList[$.inArray(colDat[0],keys)] = i;
			}
			//add comp keys to list
			if ($.inArray(colDat[0],compKeys)>=0){
				compKeyList.push(i);
			}

			i=i+1;
		}

		//key split and print
		if (compKeyList.length > 0){
			var i=0;
			var keyLength = keyList.length;
			while (i< keyLength){
				var shifted = keyList.shift();
				if ($.inArray(shifted, compKeyList) < 0){
					keyList.push(shifted);
				}
				i=i+1;
			}
			$('#parameters').append("<p>Compound Primary: "+compKeyList+" Clustering: "+keyList.toString()+"<\p>");

		}else{

			primaryKey = keyList[0];
			keyList.shift();
			$('#parameters').append("<p>Primary: "+primaryKey+" Clustering: "+keyList.toString()+"<\p>");
		}

	}
	else{
		$('#valid').html("Invalid Syntax");
	}



	//bind
	$("#parameters input").change(function(){
		calculateSize();
	});

	//stat collection

	if (compKeys != null){
		compLength = compKeys.length;
	}
}


var calculateSize = function(){

	//Here we'll be doing some math to figure out the table size etc:
	/* Here's the math

Number of rows * ( Number of Columns - Partition Keys - Static Columns ) + Static Columns = Number of Values in the Partition


Sum of the size of the Keys + Sum of the size of the static columns + Number of rows *
	( Sum of the size of the rows + Sum of the size of the Clustering Columns) +  8 * Number of Values in the Partition = Disk Partition Size

	*/
	$('#countResults p').remove();

	if ($("#rowCount").val() != ""){
		rowCount = parseInt($("#rowCount").val());
	}else{
		rowCount = 0;
	}

	var staticCount = staticList.length;

	var nv = rowCount*(columnLength - compLength - staticCount ) + staticCount;
	$('#countResults').append("<p>Number of Values in the Partition: "+(nv)+"</p>");

	var clusterKeySize = 0;
	var rowsSize = 0;
	var staticSize = 0
	var i=0;
	while (i < columnLength){

		rowsSize = rowsSize + parseInt($('#columnSize_'+i).val());

		if (i == primaryKey){
			primaryKeySize = parseInt($('#columnSize_'+i).val());
		}

		if ($.inArray(i, keyList)){
			clusterKeySize = clusterKeySize + parseInt($('#columnSize_'+i).val());
		}

		if ($.inArray(i, staticCount)){
			staticSize = staticSize + parseInt($('#columnSize_'+i).val());
		}
		i = i+1;

	}

	$('#countResults').append("<p>Disk Partition Size: " + Math.floor(((clusterKeySize + primaryKeySize) + staticSize + rowCount * (rowsSize + clusterKeySize) + 8*nv)/1048576)+" mb</p>");


}


$("#tableDef").bind('input propertychange', function() {
	processTableDef($("#tableDef").val());
});
