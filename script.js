

// Fetch data and initialize the chart
const proxyUrl = 'https://cors-anywhere.herokuapp.com/'; // Example public proxy
const targetUrl = 'https://www.cbexplorer.com/api/user-cam-trends-hourly.json';

fetch(proxyUrl + targetUrl)
   .then(response => response.json())
   .then(data => {
       processData(data)
   })
   .catch(error => console.error('Error fetching data:', error));

function processData(data) {
    // Initialize arrays for sum and count of each 30-minute segment
    let sumData = new Array(48).fill(0);
    let countData = new Array(48).fill(0);

    // Aggregate the data
    data.forEach(item => {
        // Convert to browser's local time
        let localTime = new Date(item.t);
        let segmentIndex = localTime.getHours() * 2 + Math.floor(localTime.getMinutes() / 30);
        sumData[segmentIndex] += item.u;
        countData[segmentIndex]++;
    });

    // Calculate the average for each segment
    let averageData = sumData.map((sum, index) => Math.floor(countData[index] ? sum / countData[index] : 0));

    // Prepare the xAxis labels in 12-hour format with AM/PM
	// let xAxisLabels = [];
	// for (let i = 0; i < 24; i++) {
	// 	let amPm = i < 12 ? 'AM' : 'PM';
	// 	let hour = i % 12 === 0 ? 12 : i % 12; // Convert 0 to 12 for 12 AM
	// 	xAxisLabels.push(`${hour}:00-${hour}:30 ${amPm}`, `${hour}:30-${hour + 1 === 13 ? 1 : hour + 1}:00 ${amPm}`);
	// }

	// Prepare the xAxis labels
    let xAxisLabels = [];
    for (let i = 0; i < 24; i++) {
        xAxisLabels.push(`${i}:00-${i}:30`, `${i}:30-${i + 1}:00`);
    }

	// Find the index for the current timeslot
	let now = new Date();
	let currentTimeslotIndex = now.getHours() * 2 + Math.floor(now.getMinutes() / 30);

	// Prepare the series data with highlighting for the current timeslot
	let seriesData = averageData.map((value, index) => {
		if (index === currentTimeslotIndex) {
			return {
				value: value,
				itemStyle: {
					color: '#f00',
				}
			};
		}

		return value;
	});

    // Set up the options for the bar chart
    let option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        xAxis: {
            type: 'category',
            data: xAxisLabels
        },
        yAxis: {
            type: 'value'
        },
        series: [{
            data: averageData,
            type: 'line',
            barWidth: '60%'
        }]
    };

	option.series[0].data = seriesData;

	// Set up the tooltip formatter to show CET and EST time zones
	option.tooltip = {
		trigger: 'axis',
		formatter: function (params) {
			let param = params[0];
			// Parse the CET times from the axis label
			let times = param.axisValueLabel.split('-');
			let startTimeCET = times[0].trim();
			let endTimeCET = times[1].trim();
			
			// Function to convert CET time to EST time string
			function convertCETtoEST(timeCET) {
				let [time, meridiem] = timeCET.split(' ');
				let [hour, minutes] = time.split(':').map(t => parseInt(t, 10));

				// Create a date object for CET assuming today's date
				let date = new Date();
				date.setHours(hour, minutes, 0, 0);
				
				// Convert to UTC (CET is UTC+1)
				let dateUTC = new Date(date.getTime() - 60 * 60 * 1000);
				
				// Convert to EST (EST is UTC-5)
				let dateEST = new Date(dateUTC.getTime() - 5 * 60 * 60 * 1000);
				
				// Format the EST time in 12-hour format
				let hourEST = dateEST.getHours();
				let minuteEST = dateEST.getMinutes().toString().padStart(2, '0');
				let amPmEST = hourEST >= 12 ? 'PM' : 'AM';
				hourEST = hourEST % 12;
				hourEST = hourEST ? hourEST : 12; // Convert hour '0' to '12'
				return `${hourEST}:${minuteEST} ${amPmEST}`;
			}

			// Convert both start and end times to EST
			let startTimeEST = convertCETtoEST(startTimeCET);
			startTimeEST = startTimeEST.slice(0, -3);
			let endTimeEST = convertCETtoEST(endTimeCET);

			let users = param.data?.value ?? param.data;

			return [
				`${startTimeCET}-${endTimeCET} CET<br/>`,
				`${startTimeEST}-${endTimeEST} EST<br/>`,
				`<span style="font-weight: bold; color: #3398DB;">● </span>`, // Blue dot
				`<span style="font-weight: bold;">${users}</span>` // Bold user count
			].join('');
		}
	};



    // Get the DOM element by id and set the option
    let chart = echarts.init(document.getElementById('heatmap'), 'dark');
    chart.setOption(option);
}
