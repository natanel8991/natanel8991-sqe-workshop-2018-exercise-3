import $ from 'jquery';
import {CreateFlowChartInputString} from './code-analyzer';
import * as flowchart from 'flowchart.js';

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        //document.getElementById('SubstitutedCode').innerHTML = '';
        let CodeToSub = $('#codePlaceholder').val();
        let InputVector = $('#InputVectorPlaceholder').val();
        let OutputString = (CreateFlowChartInputString(CodeToSub,InputVector));
        $('#InputVectorPlaceholder').val(OutputString);
        var diagram = flowchart.parse(OutputString);
        diagram.drawSVG('diagram',{'flowstate' : {

            'approved' : { 'fill' : 'lightgreen' }
        }});
    });
});
