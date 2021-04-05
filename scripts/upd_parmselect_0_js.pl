#!/usr/bin/perl
#

require '../scripts/parmcodes.pl';

open(ACT, "sort -k 3,4 ../data/sites_iv_0.rdb |") or die "$!";

my %SITES = ();
print "siteparms=new Array();\n";
while ($_ = <ACT>) {
	next if ($_ =~ /^#/) ;
	($site_id,$agency_cd,$site_no,$parm_cd,$dd_nu,$ts_id,$loc_web_ds,$begin_date,$end_date)=split(/\t/,$_);
	if (! defined $SITES{$site_no}) {
		$SITES{$site_no} = "<option value=\"$parm_cd\">$parm_cd - $PARM{$parm_cd}</option>";
	} else {
		next if (index($SITES{$site_no},$parm_cd) >= 0);	# remove duplicates (still need to handle different ts_ids)
		$SITES{$site_no} .= "<option value=\"$parm_cd\">$parm_cd - $PARM{$parm_cd}</option>";
	}
}
foreach $site (sort(keys %SITES)) {
	print "siteparms[\'$site\']='" . $SITES{$site} . "';\n";
}
