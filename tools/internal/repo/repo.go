// Package repo says which folder a tool works on: the site, the folder that
// holds its pages. -root picks it; the default is the working directory.
package repo

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
)

var rootFlag = flag.String("root", "", "the site's folder (default: the working directory)")

// MustRoot is the site's folder, for a main(). Call it after flag.Parse().
func MustRoot(tool string) string {
	dir := *rootFlag
	if dir == "" {
		dir = "."
	}
	abs, err := filepath.Abs(dir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s: %v\n", tool, err)
		os.Exit(1)
	}
	return abs
}
