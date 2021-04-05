#!/usr/bin/perl
#

open(ACT, "sort -k 3,4 ../data/sites_iv.rdb |") or die "$!";

%SITES = ();
print "parameters=new Array();\n";
while ($_ = <ACT>) {
	next if ($_ =~ /^#/ );

	($site_id,$agency_cd,$site_no,$parm_cd,$dd_nu,$ts_id,$loc_web_ds,$begin_date,$end_date)=split(/\t/,$_);
	if (! defined $SITES{$site_no}) {
		$SITES{$site_no} = "'$parm_cd'";
	} else {
		next if (index($SITES{$site_no},$parm_cd) >= 0);	# remove duplicates (still need to handle different ts_ids)
		$SITES{$site_no} .= ", '$parm_cd'";
	}
}
foreach $site (sort(keys %SITES)) {
	print "parameters[\'$site\']=[" . $SITES{$site} . "];\n";
}
