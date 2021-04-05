//see https://help.waterdata.usgs.gov/codes-and-parameters/instantaneous-value-qualification-code-uv_rmk_cd
qual=new Array();
qual['e']='Estimated';
qual['<']='Less than reported value.';
qual['>']='Greater than reported value.';
qual['R']='Revised';
qual['A']='Approved';
qual['P']='Provisional';

quallong=new Array();
quallong['e']='The value has been edited or estimated by USGS personnel.';
quallong['<']='The Value is known to be less than reported value.';
quallong['>']='The value is known to be greater than reported value.';
quallong['R']='Records for these data have been revised.';
quallong['A']='Approved for publication -- Processing and review completed.';
quallong['P']='Provisional data subject to revision.';
