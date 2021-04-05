#!/usr/bin/perl
#

$sites = `cut -f3 ../data/sites_iv.rdb`;

open(INV, "wget -qO - 'https://nwis.waterdata.usgs.gov/nwis/uv?format=sitefile_output&sitefile_output_format=rdb&column_name=site_no&column_name=station_nm'|");
#until ($_ = <INV> =~ /^\d\t/) {
#	print;
#	next;
#}

print "sitename=new Array();\n";
while ($_ = <INV>) {
	next if ($_ =~ /^#/);
	my ($site_no,$site_nm) = split(/\t/, $_);
	next if (index($sites, $site_no) < 0) ;	# skip non-active sites

	chop($site_nm);
	chop($site_nm);
	$site_nm =~ s/\'//g;
	print "sitename['$site_no']='$site_nm';\n";
}
