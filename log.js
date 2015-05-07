try 
{  
	if (chrome && chrome.runtime)
	{   
		console.log("chrome.runtime: "+chrome.runtime);   
		chrome.runtime.sendMessage("iojhohbfacfjepmplgkdjleclmafeddm", 
			{"sophiaTestId": ba7d7fda-6f66-4409-b3ba-41de0d479bdf},{},        
	function(response){            
	console.log("recevied response: "+response);        
	}); 
} else 
console.log("Sophia failed to communicate with extension");
}
catch(ex){    console.log("exception in sendmessage: "+ex);}